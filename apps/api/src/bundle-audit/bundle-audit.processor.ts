import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { BUNDLE_AUDIT_JOB, BUNDLE_AUDIT_QUEUE } from './bundle-audit.constants';
import { PrismaService } from '../prisma.service';
import { BundleStorageService } from './bundle-storage.service';
import { scoreBundle } from '@lca/analysis';
import AdmZip from 'adm-zip';
import { promises as fs } from 'fs';
import { BundleUploadStatus, Prisma } from '@prisma/client';

interface BundleAuditJob {
  uploadId: string;
}

interface DependencySize {
  name: string;
  sizeBytes: number;
}

@Processor(BUNDLE_AUDIT_QUEUE)
@Injectable()
export class BundleAuditProcessor extends WorkerHost {
  private readonly logger = new Logger(BundleAuditProcessor.name);
  constructor(private readonly prisma: PrismaService, private readonly storage: BundleStorageService) {
    super();
  }

  async process(job: Job<BundleAuditJob>) {
    const uploadId = job.data.uploadId;
    const upload = await this.prisma.bundleUpload.findUnique({
      where: { id: uploadId },
      include: { function: true },
    });
    if (!upload) {
      this.logger.warn(`Bundle upload ${uploadId} missing - skipping`);
      return;
    }
    await this.prisma.bundleUpload.update({
      where: { id: upload.id },
      data: { status: BundleUploadStatus.processing, errorMessage: null },
    });

    const zipPath = await this.storage.downloadToTempFile({ key: upload.storageKey, bucket: upload.storageBucket });

    try {
      const analysis = await this.analyzeZip(zipPath);
      const score = scoreBundle({ totalSizeBytes: analysis.totalSizeBytes });
      const topDepsJson = analysis.topDependencies as unknown as Prisma.JsonArray;
      const recommendationsJson = analysis.recommendations as unknown as Prisma.JsonArray;
      const breakdownJson = {
        nodeModulesBytes: analysis.nodeModulesSizeBytes,
        appCodeBytes: analysis.appCodeSizeBytes,
      } as Prisma.JsonObject;

      await this.prisma.$transaction([
        this.prisma.bundleInsight.upsert({
          where: { uploadId: upload.id },
          update: {
            functionId: upload.functionId,
            totalSizeBytes: analysis.totalSizeBytes,
            uncompressedBytes: analysis.uncompressedBytes,
            fileCount: analysis.fileCount,
            dependencyCount: analysis.dependencyCount,
            score,
            topDependencies: topDepsJson,
            sizeBreakdown: breakdownJson,
            recommendations: recommendationsJson,
          },
          create: {
            uploadId: upload.id,
            functionId: upload.functionId,
            totalSizeBytes: analysis.totalSizeBytes,
            uncompressedBytes: analysis.uncompressedBytes,
            fileCount: analysis.fileCount,
            dependencyCount: analysis.dependencyCount,
            score,
            topDependencies: topDepsJson,
            sizeBreakdown: breakdownJson,
            recommendations: recommendationsJson,
          },
        }),
        this.prisma.bundleUpload.update({
          where: { id: upload.id },
          data: { status: BundleUploadStatus.completed, processedAt: new Date(), errorMessage: null },
        }),
      ]);
      this.logger.log(`Bundle analysis complete`, { uploadId, score } as any);
    } catch (err: any) {
      const message = err?.message || 'Bundle analysis failed';
      await this.prisma.bundleUpload.update({
        where: { id: upload.id },
        data: { status: BundleUploadStatus.failed, errorMessage: message, processedAt: new Date() },
      });
      this.logger.error(`Bundle analysis failure`, { uploadId, message } as any);
      throw err;
    } finally {
      await fs.unlink(zipPath).catch(() => undefined);
    }
  }

  private async analyzeZip(zipPath: string) {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    let totalSizeBytes = 0;
    let fileCount = 0;
    const dependencySizes = new Map<string, number>();

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const size = entry.header?.size ?? entry.getData().length;
      totalSizeBytes += size;
      fileCount += 1;
      this.trackDependencySize(entry.entryName, size, dependencySizes);
    }

    const nodeModulesSizeBytes = Array.from(dependencySizes.values()).reduce((sum, size) => sum + size, 0);
    const appCodeSizeBytes = Math.max(totalSizeBytes - nodeModulesSizeBytes, 0);
    const topDependencies = this.buildTopDependencies(dependencySizes);
    const recommendations = this.buildRecommendations(totalSizeBytes, nodeModulesSizeBytes);

    return {
      totalSizeBytes,
      uncompressedBytes: totalSizeBytes,
      nodeModulesSizeBytes,
      appCodeSizeBytes,
      dependencyCount: dependencySizes.size,
      fileCount,
      topDependencies,
      recommendations,
    };
  }

  private trackDependencySize(path: string, size: number, store: Map<string, number>) {
    const parts = path.split('/').filter(Boolean);
    const nodeModulesIdx = parts.indexOf('node_modules');
    if (nodeModulesIdx === -1 || parts.length <= nodeModulesIdx + 1) return;
    let depName = parts[nodeModulesIdx + 1];
    if (depName === '.bin') return;
    if (depName.startsWith('@') && parts.length > nodeModulesIdx + 2) {
      depName = `${depName}/${parts[nodeModulesIdx + 2]}`;
    }
    store.set(depName, (store.get(depName) || 0) + size);
  }

  private buildTopDependencies(store: Map<string, number>): DependencySize[] {
    return Array.from(store.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, sizeBytes]) => ({ name, sizeBytes }));
  }

  private buildRecommendations(total: number, depsSize: number) {
    const recs: string[] = [];
    const totalMb = total / (1024 * 1024);
    const depRatio = total > 0 ? depsSize / total : 0;
    if (totalMb > 50) {
      recs.push('Bundle exceeds 50MB. Consider trimming dependencies or using Lambda layers.');
    } else if (totalMb > 10) {
      recs.push('Bundle is large. Audit devDependencies and optional packages.');
    }
    if (depRatio > 0.6) {
      recs.push('Most of the bundle is dependencies. Consider code splitting or shared layers.');
    }
    if (recs.length === 0) recs.push('Bundle size looks healthy. Keep an eye on growth over time.');
    return recs;
  }
}

