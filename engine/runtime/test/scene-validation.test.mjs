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

test('loadSceneFile throws when the scene is invalid', async () => {
  await assert.rejects(() => loadSceneFile(fixturePath('invalid_duplicate_id.scene.json')), {
    name: 'SceneValidationError'
  });
});
