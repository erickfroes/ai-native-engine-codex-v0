import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPathfindingGridReportV1 } from '../src/index.mjs';
import { assertPathfindingGridReportV1 } from './helpers/assertPathfindingGridReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixturePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'pathfinding-grid-basic.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const invalidScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_tile_layer_unknown_palette.scene.json'
);

function createLargeGridScene() {
  const columns = 65;
  const rows = 64;
  return {
    version: 1,
    metadata: {
      name: 'pathfinding-grid-too-large'
    },
    systems: ['core.loop'],
    entities: [
      {
        id: 'map.too-large',
        components: [
          {
            kind: 'tile.layer',
            version: 1,
            replicated: false,
            fields: {
              tileWidth: 8,
              tileHeight: 8,
              columns,
              rows,
              tiles: Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0)),
              palette: {
                0: {
                  kind: 'empty'
                }
              }
            }
          }
        ]
      }
    ]
  };
}

function createBlockerIdCollisionScene() {
  return {
    version: 1,
    metadata: {
      name: 'pathfinding-grid-blocker-id-collision'
    },
    systems: ['core.loop'],
    entities: [
      {
        id: 'map',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: {
              x: 99,
              y: 99
            }
          },
          {
            kind: 'tile.layer',
            version: 1,
            replicated: false,
            fields: {
              tileWidth: 8,
              tileHeight: 8,
              columns: 1,
              rows: 1,
              tiles: [[1]],
              palette: {
                1: {
                  kind: 'rect',
                  solid: true
                }
              }
            }
          }
        ]
      },
      {
        id: 'map.tile.0.0',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: {
              x: 0,
              y: 0
            }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: {
              width: 8,
              height: 8,
              solid: true
            }
          }
        ]
      },
      {
        id: 'edge.touching-bound',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: {
              x: 8,
              y: 0
            }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: {
              width: 8,
              height: 8,
              solid: true
            }
          }
        ]
      }
    ]
  };
}

test('buildPathfindingGridReportV1 returns deterministic grid occupancy from tile.layer and collision.bounds', async () => {
  const first = await buildPathfindingGridReportV1(fixturePath);
  const second = await buildPathfindingGridReportV1(fixturePath);

  assert.deepEqual(first, second);
  assertPathfindingGridReportV1(first);
  assert.deepEqual(first, {
    pathfindingGridReportVersion: 1,
    scene: 'pathfinding-grid-basic-fixture',
    grids: [
      {
        gridId: 'map.nav',
        layerEntityId: 'map.nav',
        tileWidth: 8,
        tileHeight: 8,
        columns: 3,
        rows: 2,
        origin: {
          x: 0,
          y: 0
        },
        cellCount: 6,
        blockedCellCount: 2,
        walkableCellCount: 4,
        blockedCells: [
          {
            cellId: 'map.nav.cell.0.1',
            row: 0,
            column: 1,
            x: 8,
            y: 0,
            width: 8,
            height: 8,
            blockerIds: ['tile:map.nav.tile.0.1']
          },
          {
            cellId: 'map.nav.cell.1.0',
            row: 1,
            column: 0,
            x: 0,
            y: 8,
            width: 8,
            height: 8,
            blockerIds: ['collision.bounds:wall.block']
          }
        ]
      }
    ],
    blockers: [
      {
        blockerId: 'collision.bounds:wall.block',
        kind: 'collision.bounds',
        x: 0,
        y: 8,
        width: 8,
        height: 8,
        solid: true
      },
      {
        blockerId: 'tile:map.nav.tile.0.1',
        kind: 'tile',
        x: 8,
        y: 0,
        width: 8,
        height: 8,
        solid: true
      }
    ]
  });
});

test('buildPathfindingGridReportV1 returns empty grids for scenes without tile.layer', async () => {
  const report = await buildPathfindingGridReportV1(tutorialScenePath);

  assertPathfindingGridReportV1(report);
  assert.deepEqual(report, {
    pathfindingGridReportVersion: 1,
    scene: 'tutorial',
    grids: [],
    blockers: []
  });
});

test('buildPathfindingGridReportV1 keeps multiple tile.layer grids separate and sorted', async () => {
  const report = await buildPathfindingGridReportV1({
    version: 1,
    metadata: {
      name: 'pathfinding-grid-multi-layer'
    },
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
              tileHeight: 8,
              columns: 1,
              rows: 1,
              tiles: [[0]],
              palette: {
                0: {
                  kind: 'empty'
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
              tileHeight: 4,
              columns: 1,
              rows: 1,
              tiles: [[1]],
              palette: {
                1: {
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

  assertPathfindingGridReportV1(report);
  assert.deepEqual(report.grids.map((grid) => grid.layerEntityId), ['a.map', 'z.map']);
  assert.deepEqual(report.grids[0].blockedCells.map((cell) => cell.cellId), ['a.map.cell.0.0']);
  assert.deepEqual(report.grids[1].blockedCells, []);
});

test('buildPathfindingGridReportV1 keeps blocker ids unambiguous and ignores tile.layer transform', async () => {
  const report = await buildPathfindingGridReportV1(createBlockerIdCollisionScene());

  assertPathfindingGridReportV1(report);
  assert.equal(report.grids.length, 1);
  assert.deepEqual(report.grids[0].origin, { x: 0, y: 0 });
  assert.deepEqual(report.grids[0].blockedCells, [
    {
      cellId: 'map.cell.0.0',
      row: 0,
      column: 0,
      x: 0,
      y: 0,
      width: 8,
      height: 8,
      blockerIds: ['collision.bounds:map.tile.0.0', 'tile:map.tile.0.0']
    }
  ]);
  assert.deepEqual(report.blockers.map((blocker) => blocker.blockerId), [
    'collision.bounds:edge.touching-bound',
    'collision.bounds:map.tile.0.0',
    'tile:map.tile.0.0'
  ]);
});

test('buildPathfindingGridReportV1 fails predictably for invalid scenes and oversized grids', async () => {
  await assert.rejects(
    () => buildPathfindingGridReportV1(invalidScenePath),
    /Scene validation failed for .*invalid_tile_layer_unknown_palette\.scene\.json/
  );

  await assert.rejects(
    () => buildPathfindingGridReportV1(createLargeGridScene()),
    /tile\.layer `map\.too-large` has 4160 cells; maximum supported by report v1 is 4096/
  );
});
