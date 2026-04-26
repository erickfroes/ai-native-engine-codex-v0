import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateSceneFile, loadSceneFile } from '../src/index.mjs';
import { validateSceneInvariants } from '../src/scene/invariants.mjs';

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

test('visual.sprite component invariants are validated predictably', () => {
  const report = validateSceneInvariants({
    version: 1,
    metadata: { name: 'invalid-visual' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 0, y: 0 }
          },
          {
            kind: 'visual.sprite',
            version: 2,
            replicated: true,
            fields: {
              assetId: ' ',
              width: 0,
              height: -1,
              layer: 1.5,
              tint: '#fff'
            }
          }
        ]
      }
    ]
  });

  assert.ok(report.errors.some((error) => error.path.endsWith('.version') && error.message.includes('version')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.replicated') && error.message.includes('must not be replicated')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.assetId') && error.message.includes('assetId')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.width') && error.message.includes('dimensions')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.height') && error.message.includes('dimensions')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.layer') && error.message.includes('layer')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.tint') && error.message.includes('not allowed')));
});
