import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateSceneFile, loadSceneFile } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

function fixturePath(relativePath) {
  return path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', relativePath);
}

test('validates tutorial scene successfully', async () => {
  const report = await validateSceneFile(scenePath('tutorial.scene.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.summary.entityCount, 2);
  assert.equal(report.summary.replicatedComponentCount, 2);
});

test('reports duplicate ids and replicated-system mismatch', async () => {
  const report = await validateSceneFile(fixturePath('invalid_duplicate_id.scene.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.message.includes('duplicate entity id')));
  assert.ok(
    report.errors.some((error) => error.message.includes('missing system "networking.replication"'))
  );
  assert.ok(report.errors.some((error) => error.message.includes('duplicate component kind')));
});


test('keeps scene valid when only warnings are present', async () => {
  const report = await validateSceneFile(fixturePath('valid_with_warnings.scene.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.ok(report.warnings.some((warning) => warning.message.includes('entity has no human-readable name')));
  assert.ok(report.warnings.some((warning) => warning.message.includes('duplicate asset reference')));
});


test('loadSceneFile resolves prefab components with backward-compatible fallback', async () => {
  const scene = await loadSceneFile(fixturePath('scene_with_prefab.scene.json'));
  const entity = scene.entities[0];

  assert.equal(entity.id, 'hero.from.prefab');
  assert.equal(entity.components.length, 2);
  assert.ok(entity.components.some((component) => component.kind === 'transform'));
  assert.ok(entity.components.some((component) => component.kind === 'health'));
});


test('loadSceneFile throws PrefabValidationError for invalid prefab references', async () => {
  await assert.rejects(() => loadSceneFile(fixturePath('scene_with_invalid_prefab.scene.json')), {
    name: 'PrefabValidationError'
  });
});

test('loadSceneFile throws when the scene is invalid', async () => {
  await assert.rejects(() => loadSceneFile(fixturePath('invalid_duplicate_id.scene.json')), {
    name: 'SceneValidationError'
  });
});
