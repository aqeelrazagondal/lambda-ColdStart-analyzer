export interface BundleSizeStats {
  totalSizeBytes: number;
  nodeModulesBytes: number;
  appCodeBytes: number;
  dependencySizes: Record<string, number>;
}

export function extractDependencyName(relPath: string) {
  const normalized = relPath.replace(/\\/g, '/');
  if (!normalized.startsWith('node_modules/')) return null;
  const parts = normalized.split('/').slice(1);
  if (!parts.length) return null;
  if (parts[0].startsWith('@') && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

export function topDependencies(map: Record<string, number>, top: number = 5) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([name, sizeBytes]) => ({ name, sizeBytes }));
}

export function buildBundleRecommendations(stats: BundleSizeStats, score: number): string[] {
  const recs: string[] = [];
  const sizeMb = stats.totalSizeBytes / (1024 * 1024);
  if (sizeMb > 50) recs.push('Bundle exceeds 50MB. Consider trimming dependencies or splitting code.');
  if (stats.nodeModulesBytes > stats.appCodeBytes * 2) {
    recs.push('node_modules dominates bundle size. Move heavy deps to Lambda layers or lazy-load.');
  }
  if (score < 60) {
    recs.push('Score is low; enable provisioned concurrency for latency-sensitive paths.');
  }
  if (!recs.length) recs.push('Bundle size looks healthy. Keep dependencies lean!');
  return recs;
}


