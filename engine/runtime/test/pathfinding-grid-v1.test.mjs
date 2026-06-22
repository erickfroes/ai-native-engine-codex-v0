import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import {
  assertPathfindingGridReportV1,
  assertPathfindingGridReportV1Rejects
} from './helpers/assertPathfindingGridReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'pathfinding-grid-report-v1.schema.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

function createValidReport() {
  return {
    pathfindingGridReportVersion: 1,
    scene: 'pathfinding-grid-sample',
    grids: [
      {
        gridId: 'map.nav',
        layerEntityId: 'map.nav',
        tileWidth: 8,
        tileHeight: 8,
        columns: 2,
        rows: 2,
        origin: {
          x: 0,
          y: 0
        },
        cellCount: 4,
        blockedCellCount: 2,
        walkableCellCount: 2,
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
  };
}

test('PathfindingGridReport v1 matches helper and schema', async () => {
  const report = createValidReport();

  assertPathfindingGridReportV1(report);

  const schema = await loadSchema();
  const errors = validateWithSchema(report, schema, {
    'pathfinding-grid-report-v1.schema.json': { schema }
  });
  assert.deepEqual(errors, []);
});

test('PathfindingGridReport v1 rejects extra fields at controlled levels', async () => {
  const report = createValidReport();
  report.debug = true;
  report.grids[0].diagonal = true;
  report.grids[0].origin.z = 0;
  report.grids[0].blockedCells[0].cost = 2;
  report.blockers[0].source = 'debug';

  assertPathfindingGridReportV1Rejects(report);

  const schema = await loadSchema();
  const errors = validateWithSchema(report, schema, {
    'pathfinding-grid-report-v1.schema.json': { schema }
  });

  assert.ok(errors.some((error) => error.path === '$.debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.grids[0].diagonal' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.grids[0].origin.z' && error.message === 'is not allowed by schema'));
  assert.ok(
    errors.some((error) => error.path === '$.grids[0].blockedCells[0].cost' && error.message === 'is not allowed by schema')
  );
  assert.ok(errors.some((error) => error.path === '$.blockers[0].source' && error.message === 'is not allowed by schema'));
});

test('PathfindingGridReport v1 helper rejects inconsistent cell counts and unsorted cells', () => {
  const badCounts = createValidReport();
  badCounts.grids[0].walkableCellCount = 1;
  assertPathfindingGridReportV1Rejects(badCounts);

  const unsortedCells = createValidReport();
  unsortedCells.grids[0].blockedCells.reverse();
  assertPathfindingGridReportV1Rejects(unsortedCells);

  const emptyBlockers = createValidReport();
  emptyBlockers.grids[0].blockedCells[0].blockerIds = [];
  assertPathfindingGridReportV1Rejects(emptyBlockers);

  const nonZeroOrigin = createValidReport();
  nonZeroOrigin.grids[0].origin.x = 1;
  assertPathfindingGridReportV1Rejects(nonZeroOrigin);

  const duplicateBlockerId = createValidReport();
  duplicateBlockerId.blockers[1].blockerId = duplicateBlockerId.blockers[0].blockerId;
  assertPathfindingGridReportV1Rejects(duplicateBlockerId);
});
