// Minimal unit tests for RefreshMetricsGuard rate-limiting logic
// Run via: pnpm test:api

import assert from 'assert';
import { ExecutionContext, TooManyRequestsException } from '@nestjs/common';
import { RefreshMetricsGuard } from '../src/metrics/guards/refresh-metrics.guard';

function test(title: string, fn: () => void | Promise<void>) {
  try {
    const r = fn();
    if (r && typeof (r as any).then === 'function') {
      (r as Promise<void>)
        .then(() => console.log(`✓ ${title}`))
        .catch((e) => {
          console.error(`✗ ${title}`);
          throw e;
        });
    } else {
      console.log(`✓ ${title}`);
    }
  } catch (e) {
    console.error(`✗ ${title}`);
    throw e;
  }
}

function mockContext(userId: string, functionId: string, respHeaders: Record<string, string> = {}): ExecutionContext {
  const req: any = { user: { userId }, params: { id: functionId } };
  const res: any = { setHeader: (k: string, v: string) => { respHeaders[k] = v; } };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as any;
}

test('RefreshMetricsGuard: first call allowed, second within window blocked with 429 and Retry-After', () => {
  const guard = new RefreshMetricsGuard();
  const headers: Record<string, string> = {};
  const ctx = mockContext('u1', 'f1', headers);
  // First call
  const allowed = guard.canActivate(ctx);
  assert.strictEqual(allowed, true);

  // Second call should throw TooManyRequestsException
  let threw = false;
  try {
    guard.canActivate(ctx);
  } catch (e: any) {
    threw = e instanceof TooManyRequestsException;
    // header should be set
    assert.ok(headers['Retry-After'] !== undefined, 'Retry-After header was not set');
    const body = e.getResponse?.();
    if (typeof body === 'object') {
      const retryAfterSeconds = (body as any).retryAfterSeconds;
      assert.ok(typeof retryAfterSeconds === 'number' || typeof retryAfterSeconds === 'string');
    }
  }
  assert.ok(threw, 'Expected guard to throw TooManyRequestsException');
});

test('RefreshMetricsGuard: different user or function are tracked independently', () => {
  const guard = new RefreshMetricsGuard();
  const h1: Record<string, string> = {};
  const h2: Record<string, string> = {};
  const ctx1 = mockContext('u1', 'f1', h1);
  const ctx2 = mockContext('u2', 'f1', h2);

  assert.strictEqual(guard.canActivate(ctx1), true);
  // u2 on same function should still be allowed
  assert.strictEqual(guard.canActivate(ctx2), true);
});
