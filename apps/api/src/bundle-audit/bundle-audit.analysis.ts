import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import AdmZip from 'adm-zip';
import { PrismaService } from '../prisma.service';
import { BundleStorageService } from './bundle-storage.service';
import { scoreBundle } from '@lca/analysis';
import { buildBundleRecommendations, extractDependencyName, topDependencies } from './bundle-audit.helpers';

interface DirectoryStats {
  totalSizeBytes: number;
  fileCount: number;
  dependencyCount: number;
  nodeModulesBytes: number;
  appCodeBytes: number;
  dependencySizes: Record<string, number>;
}

@Injectable()
export class BundleAuditAnalysisService {
  private readonly logger = new Logger(BundleAuditAnalysisService.name);
  private readonly tmpRoot = path.join(os.tmpdir(), 'lca-bundle-work');

  constructor(private readonly prisma: PrismaService, private readonly storage: BundleStorageService) {}

  async processUpload(uploadId: string) {
    const upload = await this.prisma.bundleUpload.findUnique({
      where: { id: uploadId },
    });
    if (!upload) {
      this.logger.warn(`Bundle upload ${uploadId} not found`);
      return;
    }

    const workingZip = path.join(this.tmpRoot, `${uploadId}.zip`);
    const extractDir = path.join(this.tmpRoot, uploadId);

    await this.markStatus(uploadId, 'processing');

    try {
      await fs.mkdir(this.tmpRoot, { recursive: true });
      await this.storage.downloadToPath({
        key: upload.storageKey,
        bucket: upload.storageBucket,
        destination: workingZip,
      });

      const zip = new AdmZip(workingZip);
      await fs.rm(extractDir, { recursive: true, force: true });
      zip.extractAllTo(extractDir, true);

      const stats = await this.analyzeDirectory(extractDir);
      const score = scoreBundle({ totalSizeBytes: stats.totalSizeBytes });
      const recommendations = buildBundleRecommendations(
        {
          totalSizeBytes: stats.totalSizeBytes,
          nodeModulesBytes: stats.nodeModulesBytes,
          appCodeBytes: stats.appCodeBytes,
          dependencySizes: stats.dependencySizes,
        },
        score
      );

      await this.prisma.bundleInsight.upsert({
        where: { uploadId },
        update: {
          functionId: upload.functionId,
          totalSizeBytes: stats.totalSizeBytes,
          uncompressedBytes: stats.totalSizeBytes,
          fileCount: stats.fileCount,
          dependencyCount: stats.dependencyCount,
          score,
          topDependencies: topDependencies(stats.dependencySizes),
          sizeBreakdown: {
            nodeModulesBytes: stats.nodeModulesBytes,
            appCodeBytes: stats.appCodeBytes,
          },
          recommendations,
        },
        create: {
          uploadId,
          functionId: upload.functionId,
          totalSizeBytes: stats.totalSizeBytes,
          uncompressedBytes: stats.totalSizeBytes,
          fileCount: stats.fileCount,
          dependencyCount: stats.dependencyCount,
          score,
          topDependencies: topDependencies(stats.dependencySizes),
          sizeBreakdown: {
            nodeModulesBytes: stats.nodeModulesBytes,
            appCodeBytes: stats.appCodeBytes,
          },
          recommendations,
        },
      });

      await this.prisma.bundleUpload.update({
        where: { id: uploadId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Bundle audit failed for ${uploadId}`, err?.stack || err?.message);
      await this.prisma.bundleUpload.update({
        where: { id: uploadId },
        data: {
          status: 'failed',
          errorMessage: err?.message || 'Bundle processing failed',
        },
      });
      throw err;
    } finally {
      await fs.rm(workingZip, { force: true });
      await fs.rm(extractDir, { recursive: true, force: true });
    }
  }

  private async analyzeDirectory(root: string): Promise<DirectoryStats> {
    let totalSizeBytes = 0;
    let fileCount = 0;
    let nodeModulesBytes = 0;
    const dependencySizes: Record<string, number> = {};

    const stack: string[] = [root];
    while (stack.length) {
      const current = stack.pop()!;
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          totalSizeBytes += stat.size;
          fileCount += 1;
          const relPath = path.relative(root, fullPath);
          if (relPath.startsWith('node_modules')) {
            nodeModulesBytes += stat.size;
            const dep = extractDependencyName(relPath);
            if (dep) dependencySizes[dep] = (dependencySizes[dep] || 0) + stat.size;
          }
        }
      }
    }

    const dependencyCount = Object.keys(dependencySizes).length;
    const appCodeBytes = Math.max(0, totalSizeBytes - nodeModulesBytes);

    return {
      totalSizeBytes,
      fileCount,
      dependencyCount,
      nodeModulesBytes,
      appCodeBytes,
      dependencySizes,
    };
  }

  private async markStatus(uploadId: string, status: 'processing') {
    await this.prisma.bundleUpload.update({
      where: { id: uploadId },
      data: { status },
    });
  }
}

