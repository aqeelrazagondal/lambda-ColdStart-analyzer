import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async get(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const [functionCount, bundleCount, openAlerts, accountsCount, dashboardsCount, notificationsCount, recentBundlesRaw, activity] =
      await this.prisma.$transaction([
        this.prisma.lambdaFunction.count({ where: { orgId } }),
        this.prisma.bundleUpload.count({ where: { orgId } }),
        this.prisma.functionAlert.count({ where: { function: { orgId }, status: 'open' } }),
        this.prisma.awsAccount.count({ where: { orgId } }),
        this.prisma.dashboardLayout.count({ where: { orgId } }),
        this.prisma.notificationChannel.count({ where: { orgId } }),
        this.prisma.bundleUpload.findMany({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { function: true },
        }),
        this.prisma.teamActivity.findMany({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            message: true,
            createdAt: true,
          },
        }),
      ]);

    const snapshots = await this.prisma.coldStartMetrics.findMany({
      where: { function: { orgId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { function: true },
    });

    const health = this.calculateHealth(snapshots);
    const topFunctions = await this.buildTopFunctions(orgId, snapshots);
    const alerts = await this.prisma.functionAlert.groupBy({
      where: { function: { orgId }, status: 'open' },
      by: ['severity'],
      _count: true,
    });

    const checklist = [
      {
        id: 'connect-aws',
        label: 'Connect AWS account',
        done: accountsCount > 0,
        description: accountsCount ? `Connected ${accountsCount} account(s)` : 'Required for metrics refresh',
      },
      {
        id: 'scan-functions',
        label: 'Scan functions',
        done: functionCount > 0,
        description: functionCount ? `${functionCount} synced` : 'Import from CloudWatch or CSV',
      },
      {
        id: 'upload-bundle',
        label: 'Upload bundle',
        done: bundleCount > 0,
      },
      {
        id: 'notification',
        label: 'Add notification channel',
        done: notificationsCount > 0,
      },
    ];

    return {
      org: { id: org.id, name: org.name },
      totals: {
        functions: functionCount,
        bundles: bundleCount,
        alertsOpen: openAlerts,
        awsAccounts: accountsCount,
        dashboards: dashboardsCount,
        notifications: notificationsCount,
      },
      health,
      topFunctions,
      recentBundles: recentBundlesRaw.map((bundle) => ({
        id: bundle.id,
        functionName: bundle.function?.functionName || 'Unknown function',
        sizeBytes: bundle.sizeBytes,
        status: bundle.status,
        createdAt: bundle.createdAt,
      })),
      activity,
      alerts: alerts.map((group) => ({ severity: group.severity, count: group._count })),
      checklist,
    };
  }

  private calculateHealth(snapshots: Array<{ p90InitMs: number | null; coldCount: number; warmCount: number }>) {
    if (!snapshots.length) return { avgP90: null, coldRatio: null };
    const totalP90 = snapshots.reduce((sum, snap) => sum + (snap.p90InitMs || 0), 0);
    const avgP90 = Math.round(totalP90 / snapshots.length);
    const cold = snapshots.reduce((sum, snap) => sum + (snap.coldCount || 0), 0);
    const warm = snapshots.reduce((sum, snap) => sum + (snap.warmCount || 0), 0);
    const coldRatio = cold + warm === 0 ? null : Math.round((cold / (cold + warm)) * 100);
    return { avgP90, coldRatio };
  }

  private async buildTopFunctions(
    orgId: string,
    snapshots: Array<{ functionId: string; p90InitMs: number | null; coldCount: number; warmCount: number; function: any }>
  ) {
    const unique: Record<string, any> = {};
    for (const snap of snapshots) {
      if (!unique[snap.functionId]) {
        unique[snap.functionId] = snap;
      }
      if (Object.keys(unique).length >= 4) break;
    }
    const selected = Object.values(unique);
    const trends = await Promise.all(
      selected.map((snap) =>
        this.prisma.regionMetricsSnapshot.findMany({
          where: { functionId: snap.functionId },
          orderBy: { periodStart: 'asc' },
          take: 12,
        })
      )
    );
    return selected.map((snap, index) => {
      const trend = trends[index] || [];
      const coldRatio = snap.coldCount + snap.warmCount === 0 ? null : Math.round((snap.coldCount / (snap.coldCount + snap.warmCount)) * 100);
      return {
        id: snap.functionId,
        name: snap.function?.functionName || 'Function',
        region: snap.function?.region,
        p90InitMs: snap.p90InitMs,
        coldRatio,
        trend: trend.map((point) => ({
          timestamp: point.periodStart.toISOString(),
          value: point.p90InitMs ?? 0,
        })),
      };
    });
  }
}

