import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateAssetManifestFile, validateSceneAssetRefs } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

function fixturePath(relativePath) {
  return path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'assets', relativePath);
}

test('validates asset manifest fixture successfully', async () => {
  const report = await validateAssetManifestFile(fixturePath('valid.manifest.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.manifest.assets.length, 2);
});

test('validates scene asset refs against manifest', async () => {
  const report = await validateSceneAssetRefs(scenePath('tutorial.scene.json'), fixturePath('valid.manifest.json'));

  assert.equal(report.ok, true);
  assert.equal(report.missingAssetRefs.length, 0);
});

test('reports missing asset references in manifest', async () => {
  const report = await validateSceneAssetRefs(scenePath('tutorial.scene.json'), fixturePath('missing-one.manifest.json'));

  assert.equal(report.ok, false);
  assert.equal(report.missingAssetRefs.length, 1);
  assert.ok(report.errors.some((error) => error.message.includes('asset reference missing in manifest')));
});
