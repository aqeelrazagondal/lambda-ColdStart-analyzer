import assert from 'assert';
import { buildBundleRecommendations, extractDependencyName, topDependencies } from '../src/bundle-audit/bundle-audit.helpers';

function test(title: string, fn: () => void) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${title}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${title}`);
    throw err;
  }
}

test('extractDependencyName handles scoped and unscoped packages', () => {
  assert.strictEqual(extractDependencyName('node_modules/lodash/index.js'), 'lodash');
  assert.strictEqual(extractDependencyName('node_modules/@aws-sdk/client-s3/dist/index.js'), '@aws-sdk/client-s3');
  assert.strictEqual(extractDependencyName('src/app.js'), null);
  assert.strictEqual(extractDependencyName(String.raw`node_modules\chalk\index.js`), 'chalk');
});

test('topDependencies sorts and truncates results', () => {
  const deps = topDependencies({ a: 10, b: 50, c: 5 }, 2);
  assert.deepStrictEqual(deps, [
    { name: 'b', sizeBytes: 50 },
    { name: 'a', sizeBytes: 10 },
  ]);
});

test('buildBundleRecommendations emits healthy message when small', () => {
  const recs = buildBundleRecommendations(
    {
      totalSizeBytes: 512 * 1024,
      nodeModulesBytes: 10,
      appCodeBytes: 512 * 1024 - 10,
      dependencySizes: {},
    },
    90
  );
  assert.ok(recs.includes('Bundle size looks healthy. Keep dependencies lean!'));
});

test('buildBundleRecommendations flags large bundles and node_modules domination', () => {
  const recs = buildBundleRecommendations(
    {
      totalSizeBytes: 60 * 1024 * 1024,
      nodeModulesBytes: 40 * 1024 * 1024,
      appCodeBytes: 5 * 1024 * 1024,
      dependencySizes: {},
    },
    40
  );
  assert.ok(recs.some((r) => r.includes('50MB')));
  assert.ok(recs.some((r) => r.includes('node_modules dominates')));
  assert.ok(recs.some((r) => r.includes('Score is low')));
});

