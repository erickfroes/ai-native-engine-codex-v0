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
const tileLayerScenePath = path.join(repoRoot, 'fixtures', 'tile-layer.scene.json');
const cameraViewportScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'camera-viewport.scene.json');
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const invalidTraversalAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid.traversal-src.asset-manifest.json');
const validCameraViewportScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'valid_camera_viewport.scene.json'
);

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

test('buildRenderSnapshotV1 keeps old scenes without visual.sprite on rect fallback', async () => {
  const snapshot = await buildRenderSnapshotV1(tutorialScenePath);

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => drawCall.kind), ['rect', 'rect']);
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => drawCall.id), ['camera.main', 'player.hero']);
});

test('buildRenderSnapshotV1 applies camera viewport offsets to tile.layer and visual.sprite drawCalls', async () => {
  const snapshot = await buildRenderSnapshotV1(cameraViewportScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.viewport, {
    width: 160,
    height: 90
  });
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'map.ground.tile.0.0',
      x: -8,
      y: -4,
      width: 16,
      height: 16,
      layer: -10
    },
    {
      kind: 'rect',
      id: 'map.ground.tile.0.1',
      x: 8,
      y: -4,
      width: 16,
      height: 16,
      layer: -10
    },
    {
      kind: 'rect',
      id: 'map.ground.tile.1.0',
      x: -8,
      y: 12,
      width: 16,
      height: 16,
      layer: -10
    },
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 22,
      y: 36,
      width: 20,
      height: 24,
      layer: 2
    }
  ]);
});

test('buildRenderSnapshotV1 lets explicit viewport options override camera viewport size', async () => {
  const snapshot = await buildRenderSnapshotV1(cameraViewportScenePath, {
    width: 96,
    height: 54
  });

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.viewport, {
    width: 96,
    height: 54
  });
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => [drawCall.id, drawCall.x, drawCall.y]), [
    ['map.ground.tile.0.0', -8, -4],
    ['map.ground.tile.0.1', 8, -4],
    ['map.ground.tile.1.0', -8, 12],
    ['player.hero', 22, 36]
  ]);
});

test('buildRenderSnapshotV1 fails predictably for invalid raw scene camera viewport objects', async () => {
  await assert.rejects(
    () => buildRenderSnapshotV1({
      metadata: { name: 'invalid-camera-scene-object' },
      entities: [
        {
          id: 'camera.main',
          components: [
            {
              kind: 'camera.viewport',
              fields: {
                x: 'left',
                y: 0,
                width: 320,
                height: 180
              }
            }
          ]
        }
      ]
    }),
    /buildRenderSnapshotV1: entity `camera\.main` camera\.viewport\.x must be an integer/
  );
});

test('buildRenderSnapshotV1 expands tile.layer into deterministic rect drawCalls', async () => {
  const snapshot = await buildRenderSnapshotV1(tileLayerScenePath);

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot, {
    renderSnapshotVersion: 1,
    scene: 'tile-layer-fixture',
    tick: 0,
    viewport: {
      width: 320,
      height: 180
    },
    drawCalls: [
      {
        kind: 'rect',
        id: 'map.ground.tile.0.0',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.0.1',
        x: 16,
        y: 0,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.0.2',
        x: 32,
        y: 0,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.0.3',
        x: 48,
        y: 0,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.1.0',
        x: 0,
        y: 16,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.1.3',
        x: 48,
        y: 16,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.2.0',
        x: 0,
        y: 32,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.2.1',
        x: 16,
        y: 32,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.2.2',
        x: 32,
        y: 32,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.2.3',
        x: 48,
        y: 32,
        width: 16,
        height: 16,
        layer: -10
      }
    ]
  });
});

test('buildRenderSnapshotV1 emits zero drawCalls for an empty-only tile.layer', async () => {
  const snapshot = await buildRenderSnapshotV1({
    metadata: { name: 'empty-only-tile-layer' },
    entities: [
      {
        id: 'map.empty',
        components: [
          {
            kind: 'tile.layer',
            fields: {
              tileWidth: 16,
              tileHeight: 16,
              columns: 2,
              rows: 2,
              layer: -5,
              tiles: [
                [0, 0],
                [0, 0]
              ],
              palette: {
                0: { kind: 'empty' }
              }
            }
          }
        ]
      }
    ]
  });

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, []);
});

test('buildRenderSnapshotV1 lets tile.layer palette rect size override tile size', async () => {
  const snapshot = await buildRenderSnapshotV1({
    metadata: { name: 'tile-layer-size-override' },
    entities: [
      {
        id: 'map.ground',
        components: [
          {
            kind: 'tile.layer',
            fields: {
              tileWidth: 16,
              tileHeight: 20,
              columns: 2,
              rows: 1,
              tiles: [[0, 2]],
              palette: {
                0: { kind: 'empty' },
                2: { kind: 'rect', width: 4, height: 6 }
              }
            }
          }
        ]
      }
    ]
  });

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'map.ground.tile.0.1',
      x: 16,
      y: 0,
      width: 4,
      height: 6,
      layer: 0
    }
  ]);
});

test('buildRenderSnapshotV1 uses layer 0 when tile.layer omits layer', async () => {
  const snapshot = await buildRenderSnapshotV1({
    metadata: { name: 'tile-layer-default-layer' },
    entities: [
      {
        id: 'map.ground',
        components: [
          {
            kind: 'tile.layer',
            fields: {
              tileWidth: 8,
              tileHeight: 8,
              columns: 1,
              rows: 1,
              tiles: [[1]],
              palette: {
                1: { kind: 'rect' }
              }
            }
          }
        ]
      }
    ]
  });

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'map.ground.tile.0.0',
      x: 0,
      y: 0,
      width: 8,
      height: 8,
      layer: 0
    }
  ]);
});

test('buildRenderSnapshotV1 keeps tile.layer and visual.sprite ordered by layer then id', async () => {
  const assetManifest = await loadValidAssetManifest();
  const snapshot = await buildRenderSnapshotV1(
    {
      metadata: { name: 'tile-layer-with-visual-sprite' },
      entities: [
        {
          id: 'player.hero',
          components: [
            {
              kind: 'transform',
              fields: { x: 10, y: 12 }
            },
            {
              kind: 'visual.sprite',
              fields: { assetId: 'player.sprite', layer: -1 }
            }
          ]
        },
        {
          id: 'map.ground',
          components: [
            {
              kind: 'tile.layer',
              fields: {
                tileWidth: 16,
                tileHeight: 16,
                columns: 1,
                rows: 1,
                layer: -1,
                tiles: [[1]],
                palette: {
                  1: { kind: 'rect' }
                }
              }
            }
          ]
        }
      ]
    },
    { assetManifest }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => `${drawCall.layer}:${drawCall.id}:${drawCall.kind}`), [
    '-1:map.ground.tile.0.0:rect',
    '-1:player.hero:sprite'
  ]);
});

test('buildRenderSnapshotV1 is deterministic for tile.layer across multiple layers', async () => {
  const scene = {
    metadata: { name: 'multi-layer-tile-layer' },
    entities: [
      {
        id: 'map.front',
        components: [
          {
            kind: 'tile.layer',
            fields: {
              tileWidth: 4,
              tileHeight: 4,
              columns: 2,
              rows: 1,
              layer: 5,
              tiles: [[1, 1]],
              palette: {
                1: { kind: 'rect' }
              }
            }
          }
        ]
      },
      {
        id: 'map.back',
        components: [
          {
            kind: 'tile.layer',
            fields: {
              tileWidth: 8,
              tileHeight: 8,
              columns: 2,
              rows: 1,
              layer: -2,
              tiles: [[1, 1]],
              palette: {
                1: { kind: 'rect' }
              }
            }
          }
        ]
      }
    ]
  };

  const first = await buildRenderSnapshotV1(scene);
  const second = await buildRenderSnapshotV1(scene);

  assertRenderSnapshotV1(first);
  assert.deepEqual(first, second);
  assert.deepEqual(first.drawCalls.map((drawCall) => `${drawCall.layer}:${drawCall.id}`), [
    '-2:map.back.tile.0.0',
    '-2:map.back.tile.0.1',
    '5:map.front.tile.0.0',
    '5:map.front.tile.0.1'
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
    assetSrc: 'images/player.png',
    x: 7,
    y: 8,
    width: 20,
    height: 24,
    layer: 2
  });
});

test('buildRenderSnapshotV1 sorts mixed rect and sprite drawCalls deterministically by layer then id', async () => {
  const assetManifest = await loadValidAssetManifest();
  const snapshot = await buildRenderSnapshotV1(
    {
      metadata: { name: 'mixed-scene' },
      entities: [
        {
          id: 'z.sprite',
          components: [
            {
              kind: 'transform',
              fields: { x: 9, y: 9 }
            },
            {
              kind: 'sprite',
              fields: { assetId: 'player.sprite', layer: 2 }
            }
          ]
        },
        {
          id: 'a.rect',
          components: [
            {
              kind: 'transform',
              fields: { x: 1, y: 2 }
            },
            {
              kind: 'sprite',
              fields: { layer: 2, width: 8, height: 8 }
            }
          ]
        },
        {
          id: 'front.rect',
          components: [
            {
              kind: 'transform',
              fields: { x: 3, y: 4 }
            },
            {
              kind: 'sprite',
              fields: { layer: 1, width: 6, height: 6 }
            }
          ]
        }
      ]
    },
    { assetManifest }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'front.rect',
      x: 3,
      y: 4,
      width: 6,
      height: 6,
      layer: 1
    },
    {
      kind: 'rect',
      id: 'a.rect',
      x: 1,
      y: 2,
      width: 8,
      height: 8,
      layer: 2
    },
    {
      kind: 'sprite',
      id: 'z.sprite',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 9,
      y: 9,
      width: 16,
      height: 16,
      layer: 2
    }
  ]);
});

test('buildRenderSnapshotV1 sorts mixed visual.sprite and rect drawCalls by layer then id', async () => {
  const assetManifest = await loadValidAssetManifest();
  const snapshot = await buildRenderSnapshotV1(
    {
      metadata: { name: 'mixed-visual-scene' },
      entities: [
        {
          id: 'z.visual',
          components: [
            {
              kind: 'transform',
              fields: { x: 9, y: 9 }
            },
            {
              kind: 'visual.sprite',
              fields: { assetId: 'player.sprite', layer: 2 }
            }
          ]
        },
        {
          id: 'a.rect',
          components: [
            {
              kind: 'transform',
              fields: { x: 1, y: 2 }
            },
            {
              kind: 'sprite',
              fields: { layer: 2, width: 8, height: 8 }
            }
          ]
        },
        {
          id: 'front.visual',
          components: [
            {
              kind: 'transform',
              fields: { x: 3, y: 4 }
            },
            {
              kind: 'visual.sprite',
              fields: { assetId: 'camera.icon', layer: -1 }
            }
          ]
        }
      ]
    },
    { assetManifest }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => `${drawCall.layer}:${drawCall.id}:${drawCall.kind}`), [
    '-1:front.visual:sprite',
    '2:a.rect:rect',
    '2:z.visual:sprite'
  ]);
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
      assetSrc: 'images/player.png',
      x: 4,
      y: 5,
      width: 16,
      height: 16,
      layer: 3
    }
  ]);
});

test('buildRenderSnapshotV1 emits sprite drawCalls from visual.sprite with asset manifest', async () => {
  const snapshot = await buildRenderSnapshotV1(
    visualSpriteScenePath,
    { assetManifestPath: visualSpriteAssetManifestPath }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 10,
      y: 12,
      width: 20,
      height: 24,
      layer: 2
    }
  ]);
});

test('buildRenderSnapshotV1 lets visual.sprite dimensions override manifest dimensions', async () => {
  const snapshot = await buildRenderSnapshotV1(
    visualSpriteScenePath,
    { assetManifestPath: visualSpriteAssetManifestPath }
  );

  assertRenderSnapshotV1(snapshot);
  assert.equal(snapshot.drawCalls[0].assetId, 'player.sprite');
  assert.equal(snapshot.drawCalls[0].width, 20);
  assert.equal(snapshot.drawCalls[0].height, 24);
});

test('buildRenderSnapshotV1 prefers visual.sprite over legacy sprite when both exist', async () => {
  const assetManifest = await loadValidAssetManifest();
  const snapshot = await buildRenderSnapshotV1(
    {
      metadata: { name: 'visual-sprite-precedence' },
      entities: [
        {
          id: 'player.hero',
          components: [
            {
              kind: 'transform',
              fields: { x: 10, y: 12 }
            },
            {
              kind: 'sprite',
              fields: { assetId: 'camera.icon', width: 8, height: 8, layer: 0 }
            },
            {
              kind: 'visual.sprite',
              fields: { assetId: 'player.sprite', width: 20, height: 24, layer: 2 }
            }
          ]
        }
      ]
    },
    { assetManifest }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 10,
      y: 12,
      width: 20,
      height: 24,
      layer: 2
    }
  ]);
});

test('buildRenderSnapshotV1 uses asset dimensions when visual.sprite omits size', async () => {
  const scene = await loadSceneFile(visualSpriteScenePath);
  const visualSprite = scene.entities[0].components.find((component) => component.kind === 'visual.sprite');
  delete visualSprite.fields.width;
  delete visualSprite.fields.height;

  const snapshot = await buildRenderSnapshotV1(scene, { assetManifestPath: visualSpriteAssetManifestPath });

  assertRenderSnapshotV1(snapshot);
  assert.equal(snapshot.drawCalls[0].width, 16);
  assert.equal(snapshot.drawCalls[0].height, 16);
});

test('buildRenderSnapshotV1 keeps rect fallback for visual.sprite without asset manifest', async () => {
  const snapshot = await buildRenderSnapshotV1(visualSpriteScenePath);

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'player.hero',
      x: 10,
      y: 12,
      width: 20,
      height: 24,
      layer: 2
    }
  ]);
});

test('buildRenderSnapshotV1 uses camera.viewport from a scene path and does not emit a fallback rect for the camera entity', async () => {
  const snapshot = await buildRenderSnapshotV1(validCameraViewportScenePath);

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot, {
    renderSnapshotVersion: 1,
    scene: 'valid-camera-viewport',
    tick: 0,
    viewport: {
      width: 320,
      height: 180
    },
    drawCalls: []
  });
});

test('buildRenderSnapshotV1 offsets rect, sprite, and tile drawCalls by camera position deterministically', async () => {
  const assetManifest = await loadValidAssetManifest();
  const scene = {
    metadata: { name: 'camera-offset-scene' },
    entities: [
      {
        id: 'camera.main',
        components: [
          {
            kind: 'camera.viewport',
            fields: { x: 100, y: 50, width: 200, height: 120 }
          }
        ]
      },
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            fields: { x: 110, y: 70 }
          },
          {
            kind: 'visual.sprite',
            fields: { assetId: 'player.sprite', layer: 2 }
          }
        ]
      },
      {
        id: 'marker.rect',
        components: [
          {
            kind: 'transform',
            fields: { x: 95, y: 55 }
          },
          {
            kind: 'sprite',
            fields: { width: 8, height: 10, layer: 0 }
          }
        ]
      },
      {
        id: 'map.ground',
        components: [
          {
            kind: 'tile.layer',
            fields: {
              tileWidth: 16,
              tileHeight: 16,
              columns: 2,
              rows: 1,
              layer: -1,
              tiles: [[1, 0]],
              palette: {
                0: { kind: 'empty' },
                1: { kind: 'rect' }
              }
            }
          }
        ]
      }
    ]
  };

  const first = await buildRenderSnapshotV1(scene, { assetManifest });
  const second = await buildRenderSnapshotV1(scene, { assetManifest });

  assertRenderSnapshotV1(first);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    renderSnapshotVersion: 1,
    scene: 'camera-offset-scene',
    tick: 0,
    viewport: {
      width: 200,
      height: 120
    },
    drawCalls: [
      {
        kind: 'rect',
        id: 'map.ground.tile.0.0',
        x: -100,
        y: -50,
        width: 16,
        height: 16,
        layer: -1
      },
      {
        kind: 'rect',
        id: 'marker.rect',
        x: -5,
        y: 5,
        width: 8,
        height: 10,
        layer: 0
      },
      {
        kind: 'sprite',
        id: 'player.hero',
        assetId: 'player.sprite',
        assetSrc: 'images/player.png',
        x: 10,
        y: 20,
        width: 16,
        height: 16,
        layer: 2
      }
    ]
  });
});

test('buildRenderSnapshotV1 lets explicit viewport options override camera.viewport dimensions', async () => {
  const snapshot = await buildRenderSnapshotV1(
    {
      metadata: { name: 'camera-viewport-override' },
      entities: [
        {
          id: 'camera.main',
          components: [
            {
              kind: 'camera.viewport',
              fields: { x: 32, y: 24, width: 200, height: 120 }
            }
          ]
        },
        {
          id: 'player.hero',
          components: [
            {
              kind: 'transform',
              fields: { x: 40, y: 30 }
            }
          ]
        }
      ]
    },
    { width: 640 }
  );

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.viewport, {
    width: 640,
    height: 120
  });
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'player.hero',
      x: 8,
      y: 6,
      width: 16,
      height: 16,
      layer: 0
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

test('buildRenderSnapshotV1 fails predictably when visual.sprite assetId is missing from the manifest', async () => {
  const assetManifest = await loadValidAssetManifest();

  await assert.rejects(
    () => buildRenderSnapshotV1(
      {
        metadata: { name: 'missing-visual-asset-scene' },
        entities: [
          {
            id: 'player.hero',
            components: [
              {
                kind: 'transform',
                fields: { x: 0, y: 0 }
              },
              {
                kind: 'visual.sprite',
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

test('buildRenderSnapshotV1 rejects unsafe asset manifest src paths', async () => {
  const scene = await readFile(path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json'), 'utf8')
    .then((rawScene) => JSON.parse(rawScene));
  await assert.rejects(
    () => buildRenderSnapshotV1(
      scene,
      { assetManifestPath: invalidTraversalAssetManifestPath }
    ),
    /asset manifest is invalid/
  );
});
