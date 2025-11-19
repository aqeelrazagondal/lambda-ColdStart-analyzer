// Utility to parse human ranges like 60s, 15m, 24h, 7d, 2w into epoch seconds window
// Returns { start, end } where both are epoch seconds.

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function parseRange(range?: string): { start: number; end: number } {
  const nowMs = Date.now();
  const end = Math.floor(nowMs / 1000);
  const str = (range && range.trim()) || '7d';
  const m = str.match(/^(\d+)([smhdw])$/i);
  let deltaMs = 7 * 24 * 3600 * 1000; // default 7d
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    if (n > 0 && UNIT_MS[unit]) {
      deltaMs = n * UNIT_MS[unit];
    }
  }
  const start = Math.floor((nowMs - deltaMs) / 1000);
  return { start, end };
}
