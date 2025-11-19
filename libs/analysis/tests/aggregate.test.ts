// Minimal test runner using Node's built-in assert
// Run with: pnpm test:analysis

import assert from 'assert';
import { aggregateColdStartMetrics, InvocationSample } from '../src';

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

// 1) No cold starts → counts correct, percentiles undefined
test('aggregateColdStartMetrics: no cold starts', () => {
  const samples: InvocationSample[] = [
    { timestamp: 't1', isColdStart: false },
    { timestamp: 't2', isColdStart: false },
  ];
  const agg = aggregateColdStartMetrics(samples);
  assert.strictEqual(agg.coldCount, 0);
  assert.strictEqual(agg.warmCount, 2);
  assert.strictEqual(agg.p50InitMs, undefined);
  assert.strictEqual(agg.p90InitMs, undefined);
  assert.strictEqual(agg.p99InitMs, undefined);
});

// 2) Mixed samples with some invalid initDurationMs ignored for percentiles
test('aggregateColdStartMetrics: ignore invalid initDurationMs for percentiles', () => {
  const samples: InvocationSample[] = [
    { timestamp: 't1', isColdStart: true, initDurationMs: 100 },
    { timestamp: 't2', isColdStart: true }, // invalid for percentile (missing init)
    { timestamp: 't3', isColdStart: false },
    { timestamp: 't4', isColdStart: true, initDurationMs: 300 },
    { timestamp: 't5', isColdStart: true, initDurationMs: 200 },
  ];
  const agg = aggregateColdStartMetrics(samples);
  assert.strictEqual(agg.coldCount, 4); // counts all isColdStart events
  assert.strictEqual(agg.warmCount, 1);
  // Percentiles computed from [100,200,300]
  assert.strictEqual(agg.p50InitMs, 200);
  assert.strictEqual(agg.p90InitMs, 300);
  assert.strictEqual(agg.p99InitMs, 300);
});

// 3) Highly skewed inputs → percentiles from sorted list
test('aggregateColdStartMetrics: skewed samples', () => {
  const samples: InvocationSample[] = [
    { timestamp: 't1', isColdStart: true, initDurationMs: 10 },
    { timestamp: 't2', isColdStart: true, initDurationMs: 12 },
    { timestamp: 't3', isColdStart: true, initDurationMs: 20 },
    { timestamp: 't4', isColdStart: true, initDurationMs: 500 },
    { timestamp: 't5', isColdStart: false },
  ];
  const agg = aggregateColdStartMetrics(samples);
  assert.strictEqual(agg.coldCount, 4);
  assert.strictEqual(agg.warmCount, 1);
  // Sorted [10,12,20,500]
  // p50 idx ceil(0.5*4)-1=1 => 12
  // p90 idx ceil(0.9*4)-1=3 => 500
  // p99 idx ceil(0.99*4)-1=3 => 500
  assert.strictEqual(agg.p50InitMs, 12);
  assert.strictEqual(agg.p90InitMs, 500);
  assert.strictEqual(agg.p99InitMs, 500);
});
