import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePrefabFile } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function prefabPath(relativePath) {
  return path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'prefabs', relativePath);
}

test('validates prefab fixture successfully', async () => {
  const report = await validatePrefabFile(prefabPath('valid.hero.prefab.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.prefab.id, 'hero.base');
});

test('reports required field errors for invalid prefab', async () => {
  const report = await validatePrefabFile(prefabPath('invalid.missing-components.prefab.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.components' && error.message === 'is required'));
});
