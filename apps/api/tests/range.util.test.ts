// Minimal test runner using Node's built-in assert
// Run with: pnpm test:api

import assert from 'assert';
import { parseRange } from '../src/metrics/util/range.util';

function approxEq(a: number, b: number, toleranceSec: number = 2) {
  assert.ok(Math.abs(a - b) <= toleranceSec, `Expected ${a} ~ ${b} (±${toleranceSec}s)`);
}

function test(title: string, fn: () => void) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${title}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${title}`);
    throw e;
  }
}

const nowSec = Math.floor(Date.now() / 1000);

test('parseRange defaults to 7d when undefined', () => {
  const { start, end } = parseRange(undefined);
  approxEq(end, nowSec);
  const expectedStart = nowSec - 7 * 24 * 3600;
  approxEq(start, expectedStart, 5);
});

test('parseRange accepts lowercase and uppercase units', () => {
  const s = parseRange('60s');
  const S = parseRange('60S');
  approxEq(s.end, S.end);
  approxEq(s.start, S.start);
});

test('parseRange 15m produces a 900s window', () => {
  const { start, end } = parseRange('15m');
  approxEq(end - start, 900, 3);
});

test('parseRange 24h produces a 86400s window', () => {
  const { start, end } = parseRange('24h');
  approxEq(end - start, 24 * 3600, 3);
});

test('parseRange 2w produces a 1209600s window', () => {
  const { start, end } = parseRange('2w');
  approxEq(end - start, 14 * 24 * 3600, 5);
});

test('parseRange invalid formats fall back to default 7d', () => {
  const cases = ['15x', '1.5h', '-5m', '0d', '', '   '];
  for (const c of cases) {
    const { start, end } = parseRange(c as any);
    approxEq(end - start, 7 * 24 * 3600, 5);
  }
});
