// AWS client wrappers using AWS SDK v3 with STS AssumeRole and Lambda list APIs.
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { LambdaClient, ListFunctionsCommand, ListFunctionsCommandOutput } from '@aws-sdk/client-lambda';
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

export interface AssumeRoleParams {
  roleArn: string;
  externalId: string;
  region?: string;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration?: string;
}

export interface LambdaFunctionSummary {
  functionName: string;
  functionArn: string;
  runtime?: string;
  memorySize?: number;
  timeout?: number;
  region?: string;
}

export class AwsClient {
  constructor(private readonly creds?: AwsCredentials, private readonly region?: string) {}

  static async assumeRole(_params: AssumeRoleParams): Promise<AwsClient> {
    const { roleArn, externalId, region } = _params;
    const sts = new STSClient({ region: region ?? process.env.AWS_REGION ?? 'us-east-1' });
    const resp = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `lca-assume-${Date.now()}`,
        ExternalId: externalId,
        DurationSeconds: 3600,
      })
    );
    if (!resp.Credentials) {
      throw new Error('AssumeRole failed: missing credentials');
    }
    const creds: AwsCredentials = {
      accessKeyId: resp.Credentials.AccessKeyId!,
      secretAccessKey: resp.Credentials.SecretAccessKey!,
      sessionToken: resp.Credentials.SessionToken!,
      expiration: resp.Credentials.Expiration?.toISOString(),
    };
    return new AwsClient(creds, region);
  }

  async listLambdaFunctions(_regions: string[]): Promise<LambdaFunctionSummary[]> {
    if (!_regions || _regions.length === 0) return [];
    const results: LambdaFunctionSummary[] = [];
    for (const region of _regions) {
      const client = new LambdaClient({
        region,
        credentials: this.creds
          ? {
              accessKeyId: this.creds.accessKeyId,
              secretAccessKey: this.creds.secretAccessKey,
              sessionToken: this.creds.sessionToken,
            }
          : undefined,
      });

      let marker: string | undefined = undefined;
      do {
        const out: ListFunctionsCommandOutput = await client.send(
          new ListFunctionsCommand({ Marker: marker })
        );
        const fns = out.Functions ?? [];
        for (const f of fns) {
          results.push({
            functionName: f.FunctionName!,
            functionArn: f.FunctionArn!,
            runtime: f.Runtime,
            memorySize: f.MemorySize,
            timeout: f.Timeout,
            region,
          });
        }
        marker = out.NextMarker;
      } while (marker);
    }
    return results;
  }

  // CloudWatch Logs Insights helpers
  private logsClient(region?: string) {
    return new CloudWatchLogsClient({
      region: region || this.region || process.env.AWS_REGION || 'us-east-1',
      credentials: this.creds
        ? {
            accessKeyId: this.creds.accessKeyId,
            secretAccessKey: this.creds.secretAccessKey,
            sessionToken: this.creds.sessionToken,
          }
        : undefined,
    });
  }

  async startLogsInsightsQuery(params: {
    region?: string;
    logGroupName: string;
    startTime: number; // epoch seconds
    endTime: number; // epoch seconds
    queryString: string;
    limit?: number;
  }): Promise<{ queryId: string }> {
    const client = this.logsClient(params.region);
    const resp = await client.send(
      new StartQueryCommand({
        logGroupName: params.logGroupName,
        startTime: params.startTime,
        endTime: params.endTime,
        queryString: params.queryString,
        limit: params.limit,
      })
    );
    if (!resp.queryId) throw new Error('StartQuery failed: missing queryId');
    return { queryId: resp.queryId };
  }

  async getLogsInsightsResults(queryId: string, region?: string): Promise<{
    status: 'Scheduled' | 'Running' | 'Complete' | 'Failed' | 'Cancelled' | string;
    results?: Array<Record<string, string>>;
    statistics?: any;
  }> {
    const client = this.logsClient(region);
    const resp = await client.send(new GetQueryResultsCommand({ queryId }));
    const results = (resp.results || []).map((row) => {
      const obj: Record<string, string> = {};
      for (const cell of row) {
        if (cell?.field) obj[cell.field] = cell.value ?? '';
      }
      return obj;
    });
    return { status: resp.status || 'Unknown', results, statistics: resp.statistics };
  }

  async runLogsInsightsQuery(params: {
    region?: string;
    logGroupName: string;
    startTime: number;
    endTime: number;
    queryString: string;
    limit?: number;
    pollIntervalMs?: number;
    timeoutMs?: number;
    baseBackoffMs?: number; // base backoff when throttled
    maxBackoffMs?: number; // cap backoff when throttled
  }): Promise<{ results: Array<Record<string, string>>; queryId: string } | { results: null; queryId: string }> {
    const { queryId } = await this.startLogsInsightsQuery(params);
    const start = Date.now();
    const pollMs = params.pollIntervalMs ?? 2000;
    const timeout = params.timeoutMs ?? 60000;
    const baseBackoff = params.baseBackoffMs ?? 1000; // 1s
    const maxBackoff = params.maxBackoffMs ?? 10000; // 10s
    let throttledBackoff = baseBackoff;

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const withJitter = (ms: number) => {
      const jitter = Math.floor(Math.random() * Math.min(1000, Math.max(100, ms / 4)));
      return ms + jitter;
    };

    while (Date.now() - start < timeout) {
      try {
        const r = await this.getLogsInsightsResults(queryId, params.region);
        if (r.status === 'Complete') {
          return { results: r.results || [], queryId };
        }
        if (r.status === 'Failed' || r.status === 'Cancelled') {
          throw new Error(`Logs Insights query ${r.status}`);
        }
        // normal polling delay
        await sleep(pollMs);
        // reset throttled backoff after a successful round-trip
        throttledBackoff = baseBackoff;
      } catch (e: any) {
        const name = e?.name || '';
        const code = e?.code || '';
        const http = e?.$metadata?.httpStatusCode;
        const isThrottle = /thrott/i.test(name) || /thrott/i.test(code) || http === 429;
        if (isThrottle) {
          const wait = withJitter(Math.min(throttledBackoff, maxBackoff));
          await sleep(wait);
          throttledBackoff = Math.min(maxBackoff, Math.max(baseBackoff, throttledBackoff * 2));
          continue;
        }
        throw e;
      }
    }
    // timeout: return queryId so caller can fetch later
    return { results: null, queryId };
  }
}
