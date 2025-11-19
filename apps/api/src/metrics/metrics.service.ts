import { BadGatewayException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrgsService } from '../orgs/orgs.service';
import { AwsClient } from '@lca/aws-client';
import { aggregateColdStartMetrics, buildNodeJsColdStartQuery } from '@lca/analysis';

// moved to util for testing; re-exported here via import
import { parseRange } from './util/range.util';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  constructor(private readonly prisma: PrismaService, private readonly orgs: OrgsService) {}

  async getFunctionAndAuthorize(functionId: string, userId: string) {
    const fn = await this.prisma.lambdaFunction.findUnique({ where: { id: functionId } });
    if (!fn) throw new NotFoundException('Function not found');
    await this.orgs.ensureUserInOrg(userId, fn.orgId);
    const acct = await this.prisma.awsAccount.findUnique({ where: { id: fn.awsAccountId } });
    if (!acct) throw new NotFoundException('AWS account connection not found');
    return { fn, acct };
  }

  buildLogsInsightsQueryString(functionName: string) {
    return buildNodeJsColdStartQuery(functionName);
  }

  async refreshMetrics(functionId: string, userId: string, range?: string) {
    const { fn, acct } = await this.getFunctionAndAuthorize(functionId, userId);
    const { start, end } = parseRange(range);

    try {
      this.logger.log(`Refreshing metrics`, {
        functionId: fn.id,
        orgId: fn.orgId,
        region: fn.region,
        range: { start, end },
      } as any);
      const client = await AwsClient.assumeRole({ roleArn: acct.roleArn, externalId: acct.externalId, region: fn.region });
      const queryString = buildNodeJsColdStartQuery(fn.functionName);
      const logGroupName = `/aws/lambda/${fn.functionName}`;
      const { results, queryId } = await client.runLogsInsightsQuery({
        region: fn.region,
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

      this.logger.log(`Metrics refreshed`, { functionId: fn.id, orgId: fn.orgId } as any);
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
}
