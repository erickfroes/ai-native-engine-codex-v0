import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, loadSceneFile } from '../src/index.mjs';
import { assertRenderSnapshotV1 } from './helpers/assertRenderSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');

async function loadValidAssetManifest() {
  return JSON.parse(await readFile(validAssetManifestPath, 'utf8'));
}

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

test('buildRenderSnapshotV1 keeps rect fallback when no asset manifest is provided', async () => {
  const snapshot = await buildRenderSnapshotV1({
    metadata: { name: 'rect-fallback' },
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            fields: { x: 2, y: 3 }
          },
          {
            kind: 'sprite',
            fields: { assetId: 'player.sprite', layer: 1 }
          }
        ]
      }
    ]
  });

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'player.hero',
      x: 2,
      y: 3,
      width: 16,
      height: 16,
      layer: 1
    }
  ]);
});

test('buildRenderSnapshotV1 emits sprite drawCalls when asset manifest is provided explicitly', async () => {
  const assetManifest = await loadValidAssetManifest();
  const snapshot = await buildRenderSnapshotV1(
    {
      metadata: { name: 'sprite-scene' },
      entities: [
        {
          id: 'z.entity',
          components: [
            {
              kind: 'transform',
              fields: { x: 7, y: 8 }
            },
            {
              kind: 'sprite',
              fields: { assetId: 'player.sprite', width: 20, height: 24, layer: 2 }
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
              fields: { assetId: 'camera.icon', layer: 2 }
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
              fields: { assetId: 'player.sprite', layer: 1 }
            }
          ]
        }
      ]
    },
    { assetManifest }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => `${drawCall.layer}:${drawCall.id}:${drawCall.kind}`), [
    '1:front.entity:sprite',
    '2:a.entity:sprite',
    '2:z.entity:sprite'
  ]);
  assert.deepEqual(snapshot.drawCalls[2], {
    kind: 'sprite',
    id: 'z.entity',
    assetId: 'player.sprite',
    x: 7,
    y: 8,
    width: 20,
    height: 24,
    layer: 2
  });
});

test('buildRenderSnapshotV1 accepts assetManifestPath and falls back to manifest dimensions', async () => {
  const snapshot = await buildRenderSnapshotV1(
    {
      metadata: { name: 'asset-path-scene' },
      entities: [
        {
          id: 'player.hero',
          components: [
            {
              kind: 'transform',
              fields: { x: 4, y: 5 }
            },
            {
              kind: 'sprite',
              fields: { assetId: 'player.sprite', layer: 3 }
            }
          ]
        }
      ]
    },
    { assetManifestPath: validAssetManifestPath }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      x: 4,
      y: 5,
      width: 16,
      height: 16,
      layer: 3
    }
  ]);
});

test('buildRenderSnapshotV1 fails predictably when a referenced assetId is missing from the manifest', async () => {
  const assetManifest = await loadValidAssetManifest();

  await assert.rejects(
    () => buildRenderSnapshotV1(
      {
        metadata: { name: 'missing-asset-scene' },
        entities: [
          {
            id: 'player.hero',
            components: [
              {
                kind: 'transform',
                fields: { x: 0, y: 0 }
              },
              {
                kind: 'sprite',
                fields: { assetId: 'missing.sprite' }
              }
            ]
          }
        ]
      },
      { assetManifest }
    ),
    /buildRenderSnapshotV1: entity `player\.hero` references unknown assetId `missing\.sprite`/
  );
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
  await assert.rejects(
    () => buildRenderSnapshotV1(tutorialScenePath, {
      assetManifest: { assetManifestVersion: 1, assets: [] },
      assetManifestPath: validAssetManifestPath
    }),
    /buildRenderSnapshotV1: provide only one of `assetManifest` or `assetManifestPath`/
  );
});
