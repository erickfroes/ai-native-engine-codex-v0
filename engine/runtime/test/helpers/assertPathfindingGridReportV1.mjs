import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['blockers', 'grids', 'pathfindingGridReportVersion', 'scene']);
const GRID_KEYS = Object.freeze([
  'blockedCellCount',
  'blockedCells',
  'cellCount',
  'columns',
  'gridId',
  'layerEntityId',
  'origin',
  'rows',
  'tileHeight',
  'tileWidth',
  'walkableCellCount'
]);
const ORIGIN_KEYS = Object.freeze(['x', 'y']);
const CELL_KEYS = Object.freeze([
  'blockerIds',
  'cellId',
  'column',
  'height',
  'row',
  'width',
  'x',
  'y'
]);
const BLOCKER_KEYS = Object.freeze(['blockerId', 'height', 'kind', 'solid', 'width', 'x', 'y']);
const BLOCKER_ID_PREFIXES = Object.freeze({
  'collision.bounds': 'collision.bounds:',
  tile: 'tile:'
});

export function assertPathfindingGridReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.deepEqual(Object.keys(report).sort(), ROOT_KEYS);
  assert.equal(report.pathfindingGridReportVersion, 1);
  assert.equal(typeof report.scene, 'string');
  assert.equal(report.scene.trim().length > 0, true);
  assert.equal(Array.isArray(report.grids), true);
  assert.equal(Array.isArray(report.blockers), true);

  let previousGridId;
  for (const grid of report.grids) {
    assert.deepEqual(Object.keys(grid).sort(), GRID_KEYS);
    assert.equal(typeof grid.gridId, 'string');
    assert.equal(grid.gridId.trim().length > 0, true);
    assert.equal(typeof grid.layerEntityId, 'string');
    assert.equal(grid.layerEntityId.trim().length > 0, true);
    if (previousGridId !== undefined) {
      assert.equal(grid.layerEntityId > previousGridId, true);
    }
    previousGridId = grid.layerEntityId;

    assert.equal(Number.isInteger(grid.tileWidth), true);
    assert.equal(grid.tileWidth >= 1, true);
    assert.equal(Number.isInteger(grid.tileHeight), true);
    assert.equal(grid.tileHeight >= 1, true);
    assert.equal(Number.isInteger(grid.columns), true);
    assert.equal(grid.columns >= 1, true);
    assert.equal(Number.isInteger(grid.rows), true);
    assert.equal(grid.rows >= 1, true);
    assert.deepEqual(Object.keys(grid.origin).sort(), ORIGIN_KEYS);
    assert.equal(grid.origin.x, 0);
    assert.equal(grid.origin.y, 0);
    assert.equal(Number.isInteger(grid.cellCount), true);
    assert.equal(Number.isInteger(grid.blockedCellCount), true);
    assert.equal(Number.isInteger(grid.walkableCellCount), true);
    assert.equal(Array.isArray(grid.blockedCells), true);
    assert.equal(grid.cellCount, grid.rows * grid.columns);
    assert.equal(grid.cellCount, grid.blockedCellCount + grid.walkableCellCount);

    let previousRow = -1;
    let previousColumn = -1;
    for (const cell of grid.blockedCells) {
      assert.deepEqual(Object.keys(cell).sort(), CELL_KEYS);
      assert.equal(typeof cell.cellId, 'string');
      assert.equal(cell.cellId.trim().length > 0, true);
      assert.equal(Number.isInteger(cell.row), true);
      assert.equal(Number.isInteger(cell.column), true);
      assert.equal(cell.row >= 0, true);
      assert.equal(cell.column >= 0, true);
      assert.equal(cell.row < grid.rows, true);
      assert.equal(cell.column < grid.columns, true);
      assert.equal(cell.row > previousRow || (cell.row === previousRow && cell.column > previousColumn), true);
      previousRow = cell.row;
      previousColumn = cell.column;
      assert.equal(cell.x, grid.origin.x + cell.column * grid.tileWidth);
      assert.equal(cell.y, grid.origin.y + cell.row * grid.tileHeight);
      assert.equal(cell.width, grid.tileWidth);
      assert.equal(cell.height, grid.tileHeight);
      assert.equal(Array.isArray(cell.blockerIds), true);
      assert.equal(cell.blockerIds.length > 0, true);
      let previousBlockerId;
      for (const blockerId of cell.blockerIds) {
        assert.equal(typeof blockerId, 'string');
        assert.equal(blockerId.trim().length > 0, true);
        assert.equal(blockerId.startsWith('collision.bounds:') || blockerId.startsWith('tile:'), true);
        if (previousBlockerId !== undefined) {
          assert.equal(blockerId > previousBlockerId, true);
        }
        previousBlockerId = blockerId;
      }
    }
    assert.equal(grid.blockedCellCount, grid.blockedCells.length);
    assert.equal(grid.walkableCellCount, grid.cellCount - grid.blockedCells.length);
  }

  let previousBlocker;
  for (const blocker of report.blockers) {
    assert.deepEqual(Object.keys(blocker).sort(), BLOCKER_KEYS);
    assert.equal(typeof blocker.blockerId, 'string');
    assert.equal(blocker.blockerId.trim().length > 0, true);
    if (previousBlocker !== undefined) {
      assert.equal(blocker.blockerId > previousBlocker.blockerId, true);
    }
    previousBlocker = blocker;
    assert.ok(['tile', 'collision.bounds'].includes(blocker.kind));
    assert.equal(blocker.blockerId.startsWith(BLOCKER_ID_PREFIXES[blocker.kind]), true);
    assert.equal(Number.isInteger(blocker.x), true);
    assert.equal(Number.isInteger(blocker.y), true);
    assert.equal(Number.isInteger(blocker.width), true);
    assert.equal(blocker.width >= 1, true);
    assert.equal(Number.isInteger(blocker.height), true);
    assert.equal(blocker.height >= 1, true);
    assert.equal(blocker.solid, true);
  }
}

export function assertPathfindingGridReportV1Rejects(report) {
  assert.throws(() => assertPathfindingGridReportV1(report));
}
