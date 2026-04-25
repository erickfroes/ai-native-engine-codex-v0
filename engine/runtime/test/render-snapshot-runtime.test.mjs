import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, loadSceneFile } from '../src/index.mjs';
import { assertRenderSnapshotV1 } from './helpers/assertRenderSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('buildRenderSnapshotV1 creates a deterministic snapshot from a scene path', async () => {
  const first = await buildRenderSnapshotV1(tutorialScenePath, { tick: 4, width: 320, height: 180 });
  const second = await buildRenderSnapshotV1(tutorialScenePath, { tick: 4, width: 320, height: 180 });

  assertRenderSnapshotV1(first);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
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
        id: 'camera.main',
        x: 0,
        y: 4,
        width: 16,
        height: 16,
        layer: 0
      },
      {
        kind: 'rect',
        id: 'player.hero',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        layer: 0
      }
    ]
  });
});

test('buildRenderSnapshotV1 accepts a scene object and sorts drawCalls by layer then id', async () => {
  const scene = await loadSceneFile(tutorialScenePath);
  const layeredScene = {
    ...scene,
    entities: [
      {
        id: 'z.entity',
        components: [
          {
            kind: 'transform',
            fields: { x: 5, y: 6 }
          },
          {
            kind: 'sprite',
            fields: { layer: 2, width: 24, height: 32 }
          }
        ]
      },
      {
        id: 'a.entity',
        components: [
          {
            kind: 'transform',
            fields: { x: 1, y: 2 }
          },
          {
            kind: 'sprite',
            fields: { layer: 2 }
          }
        ]
      },
      {
        id: 'front.entity',
        components: [
          {
            kind: 'transform',
            fields: { x: 3, y: 4 }
          },
          {
            kind: 'sprite',
            fields: { layer: 1 }
          }
        ]
      }
    ]
  };

  const snapshot = await buildRenderSnapshotV1(layeredScene);

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => drawCall.id), ['front.entity', 'a.entity', 'z.entity']);
  assert.deepEqual(snapshot.drawCalls[2], {
    kind: 'rect',
    id: 'z.entity',
    x: 5,
    y: 6,
    width: 24,
    height: 32,
    layer: 2
  });
});

test('buildRenderSnapshotV1 validates tick and viewport options', async () => {
  await assert.rejects(
    () => buildRenderSnapshotV1(tutorialScenePath, { tick: -1 }),
    /buildRenderSnapshotV1: `tick` must be an integer >= 0/
  );
  await assert.rejects(
    () => buildRenderSnapshotV1(tutorialScenePath, { width: 0 }),
    /buildRenderSnapshotV1: `width` must be an integer >= 1/
  );
  await assert.rejects(
    () => buildRenderSnapshotV1(tutorialScenePath, { height: 0 }),
    /buildRenderSnapshotV1: `height` must be an integer >= 1/
  );
});
