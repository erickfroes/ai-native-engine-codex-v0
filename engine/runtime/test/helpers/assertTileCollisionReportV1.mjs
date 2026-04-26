import assert from 'node:assert/strict';

export function assertTileCollisionReportV1(report) {
  assert.equal(report.tileCollisionReportVersion, 1);
  assert.equal(typeof report.scene, 'string');
  assert.ok(report.scene.length > 0);
  assert.ok(Array.isArray(report.tiles));
  assert.deepEqual(Object.keys(report).sort(), ['scene', 'tileCollisionReportVersion', 'tiles']);

  for (const tile of report.tiles) {
    assert.deepEqual(Object.keys(tile).sort(), [
      'column',
      'height',
      'layerEntityId',
      'paletteId',
      'row',
      'solid',
      'tileId',
      'width',
      'x',
      'y'
    ]);
    assert.equal(typeof tile.tileId, 'string');
    assert.equal(typeof tile.layerEntityId, 'string');
    assert.equal(typeof tile.paletteId, 'string');
    assert.ok(Number.isInteger(tile.row));
    assert.ok(tile.row >= 0);
    assert.ok(Number.isInteger(tile.column));
    assert.ok(tile.column >= 0);
    assert.ok(Number.isInteger(tile.x));
    assert.ok(Number.isInteger(tile.y));
    assert.ok(Number.isInteger(tile.width));
    assert.ok(tile.width >= 1);
    assert.ok(Number.isInteger(tile.height));
    assert.ok(tile.height >= 1);
    assert.equal(tile.solid, true);
  }
}
