export interface InvocationSample {
  timestamp: string;
  isColdStart: boolean;
  initDurationMs?: number;
  totalDurationMs?: number;
}

export interface AggregatedColdStartMetrics {
  coldCount: number;
  warmCount: number;
  p50InitMs?: number;
  p90InitMs?: number;
  p99InitMs?: number;
}

function percentile(values: number[], p: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function aggregateColdStartMetrics(samples: InvocationSample[]): AggregatedColdStartMetrics {
  const cold = samples.filter((s) => s.isColdStart && typeof s.initDurationMs === 'number');
  const initDurations = cold.map((s) => s.initDurationMs as number);

  return {
    coldCount: samples.filter((s) => s.isColdStart).length,
    warmCount: samples.filter((s) => !s.isColdStart).length,
    p50InitMs: percentile(initDurations, 50),
    p90InitMs: percentile(initDurations, 90),
    p99InitMs: percentile(initDurations, 99),
  };
}

export interface BundleAuditResult {
  totalSizeBytes: number;
  uncompressedSizeBytes?: number;
  nodeModulesSizeBytes?: number;
  appCodeSizeBytes?: number;
  numDependencies?: number;
  topDeps?: { name: string; sizeBytes?: number }[];
  score?: number; // 0-100
  recommendations?: string[];
}

export function scoreBundle(audit: BundleAuditResult): number {
  // Naive scoring: smaller bundles score better.
  const kb = audit.totalSizeBytes / 1024;
  if (kb <= 1024) return 95;
  if (kb <= 2048) return 85;
  if (kb <= 5120) return 70;
  if (kb <= 10240) return 55;
  return 40;
}

// Logs Insights: build Node.js Lambda cold-start query for a single function
// Returns raw rows with timestamp and initMs (if present). API will aggregate.
export function buildNodeJsColdStartQuery(functionName: string, limit: number = 10000): string {
  const logGroup = `/aws/lambda/${functionName}`;
  // Note: the logGroup is used by StartQuery; query body does not include it.
  // We parse Init Duration from REPORT lines; warm invocations have no Init Duration.
  // Output fields: @timestamp, initMs
  return [
    'fields @timestamp, @message',
    // Only REPORT lines contain durations; this reduces noise
    "| filter @message like /REPORT/",
    // Parse Init Duration if present
    "| parse @message /Init Duration: (?<initMs>\\d+\\.?\\d*) ms/",
    '| sort @timestamp desc',
    `| limit ${limit}`,
  ].join('\n');
}
