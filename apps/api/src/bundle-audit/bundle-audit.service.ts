import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BundleStorageService } from './bundle-storage.service';
import { BundleAuditQueueService } from './bundle-audit.queue';
import { ActivityService } from '../activity/activity.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Express } from 'express';
import { ActivityService } from '../activity/activity.service';

interface CreateUploadParams {
  orgId: string;
  functionId: string;
  userId?: string;
  file: Express.Multer.File;
}

@Injectable()
export class BundleAuditService {
  private readonly keyPrefix = (process.env.BUNDLE_AUDIT_PREFIX || 'bundle-uploads').replace(/\/+$/, '');

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: BundleStorageService,
    private readonly queue: BundleAuditQueueService,
    private readonly activity: ActivityService
  ) {}

  async createUpload(params: CreateUploadParams) {
    const fn = await this.prisma.lambdaFunction.findFirst({
      where: { id: params.functionId, orgId: params.orgId },
    });
    if (!fn) throw new NotFoundException('Function not found');

    const filePath = params.file.path;
    if (!filePath) throw new InternalServerErrorException('Upload failed: file missing');

    const ext = path.extname(params.file.originalname || '').toLowerCase();
    const prefix = this.keyPrefix ? `${this.keyPrefix}/` : '';
    const safeKey = `${prefix}${params.orgId}/${params.functionId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}${ext || '.zip'}`;

    const upload = await this.prisma.bundleUpload.create({
      data: {
        orgId: params.orgId,
        functionId: params.functionId,
        uploadedByUserId: params.userId,
        originalFilename: params.file.originalname || 'bundle.zip',
        storageBucket: this.storage.getBucket(),
        storageKey: safeKey,
        sizeBytes: params.file.size,
        status: 'pending',
      },
    });

    try {
      await this.storage.uploadFromPath({
        filePath,
        key: safeKey,
        contentType: params.file.mimetype || 'application/zip',
      });

      await this.prisma.bundleUpload.update({
        where: { id: upload.id },
        data: {
          status: 'processing',
          errorMessage: null,
        },
      });

      await this.queue.enqueueUpload(upload.id);
      await this.activity.record({
        orgId: params.orgId,
        userId: params.userId,
        functionId: params.functionId,
        type: 'bundle_upload',
        message: `${params.file.originalname || 'bundle.zip'} queued for analysis`,
        payload: { uploadId: upload.id, sizeBytes: params.file.size },
      });
      return { id: upload.id, status: 'processing' };
    } catch (err: any) {
      await this.prisma.bundleUpload.update({
        where: { id: upload.id },
        data: {
          status: 'failed',
          errorMessage: err?.message || 'Upload failed',
        },
      });
      throw new InternalServerErrorException(err?.message || 'Failed to store bundle');
    } finally {
      await fs.rm(filePath, { force: true });
    }
  }

  async listUploads(orgId: string, functionId: string, limit: number = 10) {
    await this.ensureFunction(orgId, functionId);
    const items = await this.prisma.bundleUpload.findMany({
      where: { orgId, functionId },
      include: { insight: true },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(50, limit)),
    });
    return {
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        originalFilename: item.originalFilename,
        sizeBytes: item.sizeBytes,
        createdAt: item.createdAt,
        processedAt: item.processedAt,
        errorMessage: item.errorMessage,
        insight: item.insight
          ? {
              id: item.insight.id,
              totalSizeBytes: item.insight.totalSizeBytes,
              uncompressedBytes: item.insight.uncompressedBytes,
              fileCount: item.insight.fileCount,
              dependencyCount: item.insight.dependencyCount,
              score: item.insight.score,
              topDependencies: item.insight.topDependencies,
              sizeBreakdown: item.insight.sizeBreakdown,
              recommendations: item.insight.recommendations,
              createdAt: item.insight.createdAt,
            }
          : null,
      })),
    };
  }

  async getLatestInsight(orgId: string, functionId: string) {
    await this.ensureFunction(orgId, functionId);
    const latest = await this.prisma.bundleInsight.findFirst({
      where: { functionId },
      orderBy: { createdAt: 'desc' },
      include: { upload: true },
    });
    if (!latest) return { insight: null };
    return {
      insight: {
        id: latest.id,
        totalSizeBytes: latest.totalSizeBytes,
        uncompressedBytes: latest.uncompressedBytes,
        fileCount: latest.fileCount,
        dependencyCount: latest.dependencyCount,
        score: latest.score,
        topDependencies: latest.topDependencies,
        sizeBreakdown: latest.sizeBreakdown,
        recommendations: latest.recommendations,
        createdAt: latest.createdAt,
        uploadId: latest.uploadId,
        originalFilename: latest.upload.originalFilename,
        status: latest.upload.status,
        processedAt: latest.upload.processedAt,
      },
    };
  }

  private async ensureFunction(orgId: string, functionId: string) {
    const fn = await this.prisma.lambdaFunction.findFirst({ where: { id: functionId, orgId } });
    if (!fn) throw new NotFoundException('Function not found');
    return fn;
  }
}
