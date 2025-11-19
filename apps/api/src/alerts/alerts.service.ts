import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrgsService } from '../orgs/orgs.service';
import { NotificationsService } from '../notifications/notifications.service';

interface EvaluationParams {
  functionId: string;
  region: string;
  coldCount: number;
  warmCount: number;
  p90InitMs?: number | null;
  orgId?: string;
}

@Injectable()
export class AlertsService {
  private readonly p90Threshold = Number(process.env.ALERT_P90_THRESHOLD_MS || 2000);
  private readonly coldRatioThreshold = Number(process.env.ALERT_COLD_RATIO || 0.1);

  private readonly orgIdCache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrgsService,
    private readonly notifications: NotificationsService
  ) {}

  async listFunctionAlerts(functionId: string, userId: string) {
    const fn = await this.prisma.lambdaFunction.findUnique({ where: { id: functionId } });
    if (!fn) throw new NotFoundException('Function not found');
    await this.orgs.ensureUserInOrg(userId, fn.orgId);
    const alerts = await this.prisma.functionAlert.findMany({
      where: { functionId: fn.id },
      orderBy: { createdAt: 'desc' },
    });
    return { alerts };
  }

  async evaluateSnapshot(params: EvaluationParams) {
    await this.checkP90Latency(params);
    await this.checkColdRatio(params);
  }

  private async checkP90Latency(params: EvaluationParams) {
    if (!params.p90InitMs) {
      await this.resolveAlert(params.functionId, params.region, 'p90_init');
      return;
    }
    if (params.p90InitMs > this.p90Threshold) {
      await this.raiseAlert({
        functionId: params.functionId,
        orgId: params.orgId,
        region: params.region,
        metric: 'p90_init',
        severity: 'critical',
        message: `P90 init time ${params.p90InitMs}ms exceeds ${this.p90Threshold}ms`,
        observedValue: params.p90InitMs,
        threshold: this.p90Threshold,
      });
    } else {
      await this.resolveAlert(params.functionId, params.region, 'p90_init');
    }
  }

  private async checkColdRatio(params: EvaluationParams) {
    const total = params.coldCount + params.warmCount;
    if (total === 0) {
      await this.resolveAlert(params.functionId, params.region, 'cold_ratio');
      return;
    }
    const ratio = params.coldCount / total;
    if (ratio > this.coldRatioThreshold) {
      await this.raiseAlert({
        functionId: params.functionId,
        orgId: params.orgId,
        region: params.region,
        metric: 'cold_ratio',
        severity: 'warning',
        message: `Cold start ratio ${(ratio * 100).toFixed(1)}% exceeds ${(this.coldRatioThreshold * 100).toFixed(1)}%`,
        observedValue: Math.round(ratio * 100),
        threshold: Math.round(this.coldRatioThreshold * 100),
      });
    } else {
      await this.resolveAlert(params.functionId, params.region, 'cold_ratio');
    }
  }

  private async raiseAlert(data: {
    functionId: string;
    orgId?: string;
    region: string;
    metric: string;
    severity: string;
    message: string;
    observedValue?: number;
    threshold?: number;
  }) {
    const existing = await this.prisma.functionAlert.findFirst({
      where: { functionId: data.functionId, region: data.region, metric: data.metric, status: 'open' },
    });
    if (existing) {
      await this.prisma.functionAlert.update({
        where: { id: existing.id },
        data: { message: data.message, observedValue: data.observedValue, threshold: data.threshold },
      });
      return existing;
    }
    const created = await this.prisma.functionAlert.create({ data });
    const orgId = data.orgId ?? (await this.getOrgIdForFunction(data.functionId));
    await this.notifications.notify(orgId, {
      title: `Lambda alert (${data.metric})`,
      message: data.message,
      severity: data.severity,
      data: {
        functionId: data.functionId,
        alertId: created.id,
        region: data.region,
      },
    });
    return created;
  }

  private async resolveAlert(functionId: string, region: string, metric: string) {
    await this.prisma.functionAlert.updateMany({
      where: { functionId, region, metric, status: 'open' },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
  }

  private async getOrgIdForFunction(functionId: string) {
    if (this.orgIdCache.has(functionId)) {
      return this.orgIdCache.get(functionId)!;
    }
    const fn = await this.prisma.lambdaFunction.findUnique({ where: { id: functionId }, select: { orgId: true } });
    if (!fn) throw new NotFoundException('Function not found');
    this.orgIdCache.set(functionId, fn.orgId);
    return fn.orgId;
  }
}
