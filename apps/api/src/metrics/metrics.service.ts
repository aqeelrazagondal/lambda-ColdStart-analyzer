import { BadGatewayException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrgsService } from '../orgs/orgs.service';
import { AwsClient } from '@lca/aws-client';
import { aggregateColdStartMetrics, buildNodeJsColdStartQuery } from '@lca/analysis';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { ActivityService } from '../activity/activity.service';
import { AlertsService } from '../alerts/alerts.service';

// moved to util for testing; re-exported here via import
import { parseRange } from './util/range.util';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrgsService,
    private readonly activity: ActivityService,
    private readonly alerts: AlertsService
  ) {}

  async refreshMetricsInternal(functionId: string, range?: string, regionOverride?: string) {
    const { fn, acct } = await this.getFunctionWithAccount(functionId);
    const result = await this.performRefresh(fn, acct, range, regionOverride);
    await this.alerts.evaluateSnapshot({
      functionId: fn.id,
      orgId: fn.orgId,
      region: regionOverride || fn.region,
      coldCount: result.snapshot.coldCount,
      warmCount: result.snapshot.warmCount,
      p90InitMs: result.snapshot.p90InitMs ?? undefined,
    });
    await this.activity.record({
      orgId: fn.orgId,
      functionId: fn.id,
      type: 'metrics_refresh_auto',
      message: `Scheduled refresh (${range || '7d'}) completed`,
      payload: { queryId: result.queryId },
    });
    return result;
  }

  async getFunctionAndAuthorize(functionId: string, userId: string) {
    const { fn, acct } = await this.getFunctionWithAccount(functionId);
    await this.orgs.ensureUserInOrg(userId, fn.orgId);
    return { fn, acct };
  }

  buildLogsInsightsQueryString(functionName: string) {
    return buildNodeJsColdStartQuery(functionName);
  }

  async refreshMetrics(functionId: string, userId: string, range?: string) {
    const { fn, acct } = await this.getFunctionAndAuthorize(functionId, userId);
    const result = await this.performRefresh(fn, acct, range);
    await this.alerts.evaluateSnapshot({
      functionId: fn.id,
      orgId: fn.orgId,
      region: fn.region,
      coldCount: result.snapshot.coldCount,
      warmCount: result.snapshot.warmCount,
      p90InitMs: result.snapshot.p90InitMs ?? undefined,
    });
    await this.activity.record({
      orgId: fn.orgId,
      userId,
      functionId: fn.id,
      type: 'metrics_refresh',
      message: `Manual refresh (${range || '7d'}) completed`,
      payload: { queryId: result.queryId },
    });
    return result;
  }

  private async performRefresh(fn: any, acct: any, range?: string, regionOverride?: string) {
    const targetRegion = regionOverride || fn.region;
    if (!targetRegion) {
      throw new BadGatewayException('Function region missing; unable to refresh metrics');
    }
    const { start, end } = parseRange(range);

    try {
      this.logger.log(`Refreshing metrics`, {
        functionId: fn.id,
        orgId: fn.orgId,
        region: targetRegion,
        range: { start, end },
      } as any);
      const client = await AwsClient.assumeRole({ roleArn: acct.roleArn, externalId: acct.externalId, region: targetRegion });
      const queryString = buildNodeJsColdStartQuery(fn.functionName);
      const logGroupName = `/aws/lambda/${fn.functionName}`;
      const { results, queryId } = await client.runLogsInsightsQuery({
        region: targetRegion,
        logGroupName,
        startTime: start,
        endTime: end,
        queryString,
        limit: 10_000,
        timeoutMs: 60_000,
      });

      // Map CWL rows → samples
      const samples = (results || []).map((row) => {
        const ts = row['@timestamp'] || row.timestamp || '';
        const initStr = row['initMs'] || row['initDurationMs'] || '';
        const init = initStr ? Number(initStr) : NaN;
        return {
          timestamp: ts,
          isColdStart: !Number.isNaN(init),
          initDurationMs: !Number.isNaN(init) ? init : undefined,
        };
      });

      const agg = aggregateColdStartMetrics(samples as any);
      const snapshot = await this.prisma.coldStartMetrics.create({
        data: {
          functionId: fn.id,
          periodStart: new Date(start * 1000),
          periodEnd: new Date(end * 1000),
          coldCount: agg.coldCount,
          warmCount: agg.warmCount,
          p50InitMs: agg.p50InitMs ? Math.round(agg.p50InitMs) : null,
          p90InitMs: agg.p90InitMs ? Math.round(agg.p90InitMs) : null,
          p99InitMs: agg.p99InitMs ? Math.round(agg.p99InitMs) : null,
          source: 'logs_insights',
        },
      });

      await this.prisma.regionMetricsSnapshot.create({
        data: {
          functionId: fn.id,
          region: targetRegion,
          periodStart: new Date(start * 1000),
          periodEnd: new Date(end * 1000),
          coldCount: agg.coldCount,
          warmCount: agg.warmCount,
          p50InitMs: agg.p50InitMs ? Math.round(agg.p50InitMs) : null,
          p90InitMs: agg.p90InitMs ? Math.round(agg.p90InitMs) : null,
          p99InitMs: agg.p99InitMs ? Math.round(agg.p99InitMs) : null,
        },
      });

      this.logger.log(`Metrics refreshed`, { functionId: fn.id, orgId: fn.orgId, region: targetRegion } as any);
      return { queryId, snapshot };
    } catch (e: any) {
      const requestId = e?.$metadata?.requestId || e?.requestId;
      const message = e?.message || 'CloudWatch Logs error';
      // log in a sanitized manner (no secrets)
      this.logger.error(`Provider error during metrics refresh`, { functionId, requestId, message } as any);
      throw new BadGatewayException({ message, requestId });
    }
  }

  async getLatestMetrics(functionId: string, userId: string, range?: string) {
    const { fn } = await this.getFunctionAndAuthorize(functionId, userId);
    const { start, end } = parseRange(range);
    const row = await this.prisma.coldStartMetrics.findFirst({
      where: { functionId: fn.id, periodStart: { gte: new Date(start * 1000) }, periodEnd: { lte: new Date(end * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    return { range: { start, end }, snapshot: row || null };
  }


  async getRegionSnapshots(functionId: string, userId: string, targetRegion?: string, range?: string) {
    const { fn } = await this.getFunctionAndAuthorize(functionId, userId);
    const effectiveRegion = targetRegion || fn.region;
    if (!effectiveRegion) {
      throw new NotFoundException('Function region not configured');
    }
    const { start, end } = parseRange(range);
    const items = await this.prisma.regionMetricsSnapshot.findMany({
      where: {
        functionId: fn.id,
        region: effectiveRegion,
        periodStart: { gte: new Date(start * 1000) },
        periodEnd: { lte: new Date(end * 1000) },
      },
      orderBy: { periodStart: 'asc' },
    });
    return { region: effectiveRegion, range: { start, end }, snapshots: items };
  }

  async getMetricBuckets(
    functionId: string,
    userId: string,
    opts: { region?: string; range?: string; buckets?: number } = {}
  ) {
    const { fn } = await this.getFunctionAndAuthorize(functionId, userId);
    const { start, end } = parseRange(opts.range);
    const bucketCount = Math.min(200, Math.max(1, Number(opts.buckets) || 24));
    const effectiveRegion = opts.region || fn.region;

    let snapshots: SnapshotLike[] = [];
    if (effectiveRegion) {
      const regionSnapshots = await this.prisma.regionMetricsSnapshot.findMany({
        where: {
          functionId: fn.id,
          region: effectiveRegion,
          periodStart: { gte: new Date(start * 1000) },
          periodEnd: { lte: new Date(end * 1000) },
        },
        orderBy: { periodStart: 'asc' },
      });
      snapshots = regionSnapshots.map((item) => ({
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        coldCount: item.coldCount,
        warmCount: item.warmCount,
        p90InitMs: item.p90InitMs ?? null,
      }));
    }

    if (!snapshots.length) {
      const fallback = await this.prisma.coldStartMetrics.findMany({
        where: {
          functionId: fn.id,
          periodStart: { gte: new Date(start * 1000) },
          periodEnd: { lte: new Date(end * 1000) },
        },
        orderBy: { periodStart: 'asc' },
      });
      snapshots = fallback.map((item) => ({
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        coldCount: item.coldCount,
        warmCount: item.warmCount,
        p90InitMs: item.p90InitMs ?? null,
      }));
    }

    const buckets = this.bucketizeSnapshots(
      snapshots.map((snap) => ({
        periodStart: snap.periodStart,
        coldCount: snap.coldCount,
        warmCount: snap.warmCount,
        p90InitMs: snap.p90InitMs ?? null,
      })),
      start,
      end,
      bucketCount
    );

    return {
      region: effectiveRegion || null,
      range: { start, end },
      buckets,
    };
  }

  private async getFunctionWithAccount(functionId: string) {
    const fn = await this.prisma.lambdaFunction.findUnique({ where: { id: functionId } });
    if (!fn) throw new NotFoundException('Function not found');
    const acct = await this.prisma.awsAccount.findUnique({ where: { id: fn.awsAccountId } });
    if (!acct) throw new NotFoundException('AWS account connection not found');
    return { fn, acct };
  }

  async listFunctionRegions(functionId: string, userId: string) {
    const { fn } = await this.getFunctionAndAuthorize(functionId, userId);
    const schedule = await this.prisma.functionRefreshSchedule.findUnique({ where: { functionId: fn.id } });
    const regions = new Set<string>();
    if (fn.region) regions.add(fn.region);
    this.parseRegionList(schedule?.regions).forEach((region) => regions.add(region));
    return { regions: Array.from(regions) };
  }

  private parseRegionList(regions: Prisma.JsonValue | null | undefined): string[] {
    if (Array.isArray(regions)) {
      return regions.filter((value) => typeof value === 'string') as string[];
    }
    if (typeof regions === 'string') {
      return [regions];
    }
    return [];
  }

  private bucketizeSnapshots(
    data: SnapshotInput[],
    windowStartSeconds: number,
    windowEndSeconds: number,
    bucketCount: number
  ) {
    const safeEnd = windowEndSeconds <= windowStartSeconds ? windowStartSeconds + bucketCount : windowEndSeconds;
    const totalDuration = safeEnd - windowStartSeconds;
    const bucketSize = totalDuration / bucketCount || 1;

    const buckets = Array.from({ length: bucketCount }, (_, idx) => ({
      start: windowStartSeconds + idx * bucketSize,
      end: idx === bucketCount - 1 ? safeEnd : windowStartSeconds + (idx + 1) * bucketSize,
      coldCount: 0,
      warmCount: 0,
      p90Sum: 0,
      p90Samples: 0,
    }));

    data.forEach((entry) => {
      const ts = Math.floor(new Date(entry.periodStart).getTime() / 1000);
      if (ts < windowStartSeconds || ts > safeEnd) return;
      let idx = Math.floor((ts - windowStartSeconds) / bucketSize);
      if (idx >= buckets.length) idx = buckets.length - 1;
      const bucket = buckets[idx];
      bucket.coldCount += entry.coldCount || 0;
      bucket.warmCount += entry.warmCount || 0;
      if (typeof entry.p90InitMs === 'number') {
        bucket.p90Sum += entry.p90InitMs;
        bucket.p90Samples += 1;
      }
    });

    return buckets.map((bucket) => ({
      start: new Date(Math.round(bucket.start) * 1000).toISOString(),
      end: new Date(Math.round(bucket.end) * 1000).toISOString(),
      coldCount: bucket.coldCount,
      warmCount: bucket.warmCount,
      avgP90InitMs: bucket.p90Samples ? Math.round(bucket.p90Sum / bucket.p90Samples) : null,
    }));
  }

  async generateCsvExport(functionId: string, userId: string, opts: ExportOptions) {
    const data = await this.fetchSnapshotsForExport(functionId, userId, opts);
    const header = ['Period Start', 'Period End', 'Cold Count', 'Warm Count', 'P50 Init', 'P90 Init', 'P99 Init'];
    const rows = data.snapshots.map((snap) => [
      snap.periodStart.toISOString(),
      snap.periodEnd.toISOString(),
      String(snap.coldCount ?? 0),
      String(snap.warmCount ?? 0),
      snap.p50InitMs != null ? String(snap.p50InitMs) : '',
      snap.p90InitMs != null ? String(snap.p90InitMs) : '',
      snap.p99InitMs != null ? String(snap.p99InitMs) : '',
    ]);
    return [header, ...rows].map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  async generatePdfExport(functionId: string, userId: string, opts: ExportOptions) {
    const data = await this.fetchSnapshotsForExport(functionId, userId, opts);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.fontSize(18).text(`Cold Start Report: ${data.functionName}`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Org: ${data.orgName}`);
    doc.text(`Region: ${data.region || 'Default'}`);
    doc.text(
      `Range: ${new Date(data.range.start * 1000).toLocaleString()} → ${new Date(
        data.range.end * 1000
      ).toLocaleString()}`
    );
    doc.moveDown(0.5);

    const totals = data.snapshots.reduce(
      (acc, snap) => {
        acc.cold += snap.coldCount ?? 0;
        acc.warm += snap.warmCount ?? 0;
        return acc;
      },
      { cold: 0, warm: 0 }
    );
    const totalInvocations = totals.cold + totals.warm || 1;
    const coldRatio = ((totals.cold / totalInvocations) * 100).toFixed(1);

    doc.text(`Total cold invocations: ${totals.cold}`);
    doc.text(`Total warm invocations: ${totals.warm}`);
    doc.text(`Cold start ratio: ${coldRatio}%`);
    doc.moveDown(0.5);

    doc.fontSize(12).text('Snapshots:', { underline: true });
    doc.moveDown(0.25);

    const columnWidths = [140, 140, 70, 70];
    doc.fontSize(10);
    this.drawPdfRow(doc, ['Period Start', 'Period End', 'Cold', 'Warm'], columnWidths, true);
    data.snapshots.forEach((snap) => {
      this.drawPdfRow(
        doc,
        [
          snap.periodStart.toISOString(),
          snap.periodEnd.toISOString(),
          String(snap.coldCount ?? 0),
          String(snap.warmCount ?? 0),
        ],
        columnWidths,
        false
      );
    });
    return doc;
  }

  private drawPdfRow(doc: PDFDocument, cols: string[], widths: number[], bold: boolean) {
    if (bold) doc.font('Helvetica-Bold');
    else doc.font('Helvetica');
    cols.forEach((col, index) => {
      doc.text(col, { continued: index < cols.length - 1, width: widths[index] });
    });
    doc.moveDown(0.2);
  }

  private async fetchSnapshotsForExport(functionId: string, userId: string, opts: ExportOptions) {
    const { fn } = await this.getFunctionAndAuthorize(functionId, userId);
    const { start, end } = parseRange(opts.range);
    let snapshots: ExportSnapshot[];

    if (opts.region) {
      const rows = await this.prisma.regionMetricsSnapshot.findMany({
        where: {
          functionId: fn.id,
          region: opts.region,
          periodStart: { gte: new Date(start * 1000) },
          periodEnd: { lte: new Date(end * 1000) },
        },
        orderBy: { periodStart: 'asc' },
      });
      snapshots = rows.map((row) => ({
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        coldCount: row.coldCount,
        warmCount: row.warmCount,
        p50InitMs: row.p50InitMs,
        p90InitMs: row.p90InitMs,
        p99InitMs: row.p99InitMs,
      }));
    } else {
      const rows = await this.prisma.coldStartMetrics.findMany({
        where: {
          functionId: fn.id,
          periodStart: { gte: new Date(start * 1000) },
          periodEnd: { lte: new Date(end * 1000) },
        },
        orderBy: { periodStart: 'asc' },
      });
      snapshots = rows.map((row) => ({
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        coldCount: row.coldCount,
        warmCount: row.warmCount,
        p50InitMs: row.p50InitMs,
        p90InitMs: row.p90InitMs,
        p99InitMs: row.p99InitMs,
      }));
    }

    return {
      functionName: fn.functionName,
      orgName: fn.org.name,
      range: { start, end },
      region: opts.region,
      snapshots,
    };
  }
}

type SnapshotLike = {
  periodStart: Date;
  periodEnd: Date;
  coldCount: number;
  warmCount: number;
  p90InitMs: number | null;
};

type SnapshotInput = {
  periodStart: Date | string;
  coldCount: number;
  warmCount: number;
  p90InitMs: number | null;
};

type ExportSnapshot = {
  periodStart: Date;
  periodEnd: Date;
  coldCount: number | null;
  warmCount: number | null;
  p50InitMs: number | null;
  p90InitMs: number | null;
  p99InitMs: number | null;
};

type ExportOptions = {
  range?: string;
  region?: string;
};
