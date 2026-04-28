import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildTileCollisionReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const solidFixturePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'tile-collision-solid.scene.json');
const emptyFixturePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'tile-collision-empty.scene.json');
const invalidFixturePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_tile_collision_solid.scene.json'
);
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('buildTileCollisionReportV1 returns deterministic solid tile bounds from tile.layer palette', async () => {
  const first = await buildTileCollisionReportV1(solidFixturePath);
  const second = await buildTileCollisionReportV1(solidFixturePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    tileCollisionReportVersion: 1,
    scene: 'tile-collision-solid-fixture',
    tiles: [
      {
        tileId: 'map.walls.tile.0.0',
        layerEntityId: 'map.walls',
        row: 0,
        column: 0,
        paletteId: '1',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        solid: true
      },
      {
        tileId: 'map.walls.tile.0.2',
        layerEntityId: 'map.walls',
        row: 0,
        column: 2,
        paletteId: 'wall',
        x: 32,
        y: 0,
        width: 24,
        height: 24,
        solid: true
      },
      {
        tileId: 'map.walls.tile.1.1',
        layerEntityId: 'map.walls',
        row: 1,
        column: 1,
        paletteId: '1',
        x: 16,
        y: 16,
        width: 16,
        height: 16,
        solid: true
      }
    ]
  });
});

test('buildTileCollisionReportV1 returns empty tiles when tile.layer has no solid entries', async () => {
  const report = await buildTileCollisionReportV1(emptyFixturePath);

  assert.deepEqual(report, {
    tileCollisionReportVersion: 1,
    scene: 'tile-collision-empty-fixture',
    tiles: []
  });
});

test('buildTileCollisionReportV1 returns empty tiles when scene has no tile.layer', async () => {
  const report = await buildTileCollisionReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    tileCollisionReportVersion: 1,
    scene: 'tutorial',
    tiles: []
  });
});

test('buildTileCollisionReportV1 supports raw scene objects and deterministic entity ordering', async () => {
  const report = await buildTileCollisionReportV1({
    version: 1,
    metadata: { name: 'raw-tile-collision' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'z.map',
        components: [
          {
            kind: 'tile.layer',
            version: 1,
            replicated: false,
            fields: {
              tileWidth: 8,
              tileHeight: 9,
              columns: 1,
              rows: 1,
              tiles: [[2]],
              palette: {
                2: {
                  kind: 'rect',
                  solid: true
                }
              }
            }
          }
        ]
      },
      {
        id: 'a.map',
        components: [
          {
            kind: 'tile.layer',
            version: 1,
            replicated: false,
            fields: {
              tileWidth: 4,
              tileHeight: 5,
              columns: 1,
              rows: 1,
              tiles: [['wall']],
              palette: {
                wall: {
                  kind: 'rect',
                  solid: true
                }
              }
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(report.tiles.map((tile) => tile.tileId), [
    'a.map.tile.0.0',
    'z.map.tile.0.0'
  ]);
});

test('buildTileCollisionReportV1 fails predictably for invalid raw tile collision scene objects', async () => {
  await assert.rejects(
    () => buildTileCollisionReportV1({
      version: 1,
      metadata: { name: 'invalid-raw-tile-collision' },
      systems: ['core.loop'],
      entities: [
        {
          id: 'map.invalid',
          components: [
            {
              kind: 'tile.layer',
              version: 1,
              replicated: false,
              fields: {
                tileWidth: 16,
                tileHeight: 16,
                columns: 1,
                rows: 1,
                tiles: [[1]],
                palette: {
                  1: {
                    kind: 'rect',
                    solid: 'yes'
                  }
                }
              }
            }
          ]
        }
      ]
    }),
    /buildTileCollisionReportV1: scene object is invalid: \$\.entities\[0\]\.components\[0\]\.fields\.palette\."1"\.solid: tile\.layer palette rect solid must be a boolean when provided/
  );
});

test('buildTileCollisionReportV1 fails predictably for invalid scene files', async () => {
  await assert.rejects(
    () => buildTileCollisionReportV1(invalidFixturePath),
    /Scene validation failed for .*invalid_tile_collision_solid\.scene\.json/
  );
});
