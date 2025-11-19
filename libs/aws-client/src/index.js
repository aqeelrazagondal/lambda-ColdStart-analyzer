"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsClient = void 0;
// AWS client wrappers using AWS SDK v3 with STS AssumeRole and Lambda list APIs.
const client_sts_1 = require("@aws-sdk/client-sts");
const client_lambda_1 = require("@aws-sdk/client-lambda");
const client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
class AwsClient {
    constructor(creds, region) {
        this.creds = creds;
        this.region = region;
    }
    static async assumeRole(_params) {
        const { roleArn, externalId, region } = _params;
        const sts = new client_sts_1.STSClient({ region: region ?? process.env.AWS_REGION ?? 'us-east-1' });
        const resp = await sts.send(new client_sts_1.AssumeRoleCommand({
            RoleArn: roleArn,
            RoleSessionName: `lca-assume-${Date.now()}`,
            ExternalId: externalId,
            DurationSeconds: 3600,
        }));
        if (!resp.Credentials) {
            throw new Error('AssumeRole failed: missing credentials');
        }
        const creds = {
            accessKeyId: resp.Credentials.AccessKeyId,
            secretAccessKey: resp.Credentials.SecretAccessKey,
            sessionToken: resp.Credentials.SessionToken,
            expiration: resp.Credentials.Expiration?.toISOString(),
        };
        return new AwsClient(creds, region);
    }
    async listLambdaFunctions(_regions) {
        if (!_regions || _regions.length === 0)
            return [];
        const results = [];
        for (const region of _regions) {
            const client = new client_lambda_1.LambdaClient({
                region,
                credentials: this.creds
                    ? {
                        accessKeyId: this.creds.accessKeyId,
                        secretAccessKey: this.creds.secretAccessKey,
                        sessionToken: this.creds.sessionToken,
                    }
                    : undefined,
            });
            let marker = undefined;
            do {
                const out = await client.send(new client_lambda_1.ListFunctionsCommand({ Marker: marker }));
                const fns = out.Functions ?? [];
                for (const f of fns) {
                    results.push({
                        functionName: f.FunctionName,
                        functionArn: f.FunctionArn,
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
    logsClient(region) {
        return new client_cloudwatch_logs_1.CloudWatchLogsClient({
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
    async startLogsInsightsQuery(params) {
        const client = this.logsClient(params.region);
        const resp = await client.send(new client_cloudwatch_logs_1.StartQueryCommand({
            logGroupName: params.logGroupName,
            startTime: params.startTime,
            endTime: params.endTime,
            queryString: params.queryString,
            limit: params.limit,
        }));
        if (!resp.queryId)
            throw new Error('StartQuery failed: missing queryId');
        return { queryId: resp.queryId };
    }
    async getLogsInsightsResults(queryId, region) {
        const client = this.logsClient(region);
        const resp = await client.send(new client_cloudwatch_logs_1.GetQueryResultsCommand({ queryId }));
        const results = (resp.results || []).map((row) => {
            const obj = {};
            for (const cell of row) {
                if (cell?.field)
                    obj[cell.field] = cell.value ?? '';
            }
            return obj;
        });
        return { status: resp.status || 'Unknown', results, statistics: resp.statistics };
    }
    async runLogsInsightsQuery(params) {
        const { queryId } = await this.startLogsInsightsQuery(params);
        const start = Date.now();
        const pollMs = params.pollIntervalMs ?? 2000;
        const timeout = params.timeoutMs ?? 60000;
        const baseBackoff = params.baseBackoffMs ?? 1000; // 1s
        const maxBackoff = params.maxBackoffMs ?? 10000; // 10s
        let throttledBackoff = baseBackoff;
        const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
        const withJitter = (ms) => {
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
            }
            catch (e) {
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
exports.AwsClient = AwsClient;
