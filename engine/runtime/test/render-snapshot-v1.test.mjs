import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import { assertRenderSnapshotV1, assertRenderSnapshotV1Rejects } from './helpers/assertRenderSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'render-snapshot-v1.schema.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

test('render snapshot v1: valid rect and sprite draw calls match helper and schema', async () => {
  const snapshot = {
    renderSnapshotVersion: 1,
    scene: 'tutorial',
    tick: 4,
    viewport: {
      width: 320,
      height: 180
    },
    drawCalls: [
      {
        kind: 'rect',
        id: 'player.hero',
        x: 10,
        y: 20,
        width: 16,
        height: 16,
        layer: 0
      },
      {
        kind: 'sprite',
        id: 'camera.icon',
        assetId: 'camera.icon',
        assetSrc: 'images/camera-icon.png',
        x: 24,
        y: 20,
        width: 16,
        height: 16,
        layer: 1
      }
    ]
  };

  assertRenderSnapshotV1(snapshot);

  const schema = await loadSchema();
  const errors = validateWithSchema(snapshot, schema, { 'render-snapshot-v1.schema.json': { schema } });
  assert.deepEqual(errors, []);
});

test('render snapshot v1: rejects extra fields at controlled levels', async () => {
  const snapshot = {
    renderSnapshotVersion: 1,
    scene: 'tutorial',
    tick: 4,
    viewport: {
      width: 320,
      height: 180,
      scale: 2
    },
    drawCalls: [
      {
        kind: 'sprite',
        id: 'player.hero',
        assetId: 'player.sprite',
        x: 10,
        y: 20,
        width: 16,
        height: 16,
        layer: 0,
        color: '#ffffff'
      }
    ],
    debug: true
  };

  assertRenderSnapshotV1Rejects(snapshot);

  const schema = await loadSchema();
  const errors = validateWithSchema(snapshot, schema, { 'render-snapshot-v1.schema.json': { schema } });
  assert.ok(errors.some((error) => error.path === '$.viewport.scale' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.drawCalls[0].color' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.debug' && error.message === 'is not allowed by schema'));
});

test('render snapshot v1: helper rejects sprite draw calls without assetId', () => {
  assertRenderSnapshotV1Rejects({
    renderSnapshotVersion: 1,
    scene: 'tutorial',
    tick: 4,
    viewport: {
      width: 320,
      height: 180
    },
    drawCalls: [
      {
        kind: 'sprite',
        id: 'player.hero',
        x: 10,
        y: 20,
        width: 16,
        height: 16,
        layer: 0
      }
    ]
  });
});
