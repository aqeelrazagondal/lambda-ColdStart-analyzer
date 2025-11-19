// Lightweight validation/controller-ish tests without spinning up Nest app
// We validate that RangeDto enforces the expected regex and would yield a 400 via ValidationPipe

import assert from 'assert';
import { ValidationPipe } from '@nestjs/common';
import { RangeDto } from '../src/metrics/dto/range.dto';

function test(title: string, fn: () => void | Promise<void>) {
  try {
    const r = fn();
    if (r && typeof (r as any).then === 'function') {
      (r as Promise<void>)
        .then(() => console.log(`✓ ${title}`))
        .catch((e) => { console.error(`✗ ${title}`); throw e; });
    } else {
      console.log(`✓ ${title}`);
    }
  } catch (e) {
    console.error(`✗ ${title}`);
    throw e;
  }
}

const pipe = new ValidationPipe({ whitelist: true, transform: true });

test('RangeDto valid range passes (e.g., 7d)', () => {
  const obj: any = { range: '7d' };
  const result = pipe.transform(obj, { type: 'query', metatype: RangeDto } as any) as RangeDto;
  assert.strictEqual(result.range, '7d');
});

test('RangeDto invalid range fails with 400 (e.g., 15x)', () => {
  const obj: any = { range: '15x' };
  let threw = false;
  try {
    pipe.transform(obj, { type: 'query', metatype: RangeDto } as any);
  } catch (e: any) {
    threw = e.getStatus?.() === 400;
    const res = e.getResponse?.();
    if (typeof res === 'object') {
      // expect some message referencing our regex message
      const msg = (res as any).message?.join?.(' ') || (res as any).message || '';
      assert.ok(String(msg).toLowerCase().includes('range must match')); 
    }
  }
  assert.ok(threw, 'Expected ValidationPipe to throw 400 for invalid range');
});
