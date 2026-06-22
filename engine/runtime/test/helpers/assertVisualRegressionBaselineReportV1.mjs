import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze([
  'drawCallCount',
  'drawCallsByKind',
  'hashAlgorithm',
  'layers',
  'renderSnapshotVersion',
  'scene',
  'snapshotHash',
  'svgHash',
  'svgVersion',
  'tick',
  'uniqueSpriteAssetIds',
  'viewport',
  'visualRegressionBaselineReportVersion'
]);
const VIEWPORT_KEYS = Object.freeze(['height', 'width']);
const DRAW_CALLS_BY_KIND_KEYS = Object.freeze(['rect', 'sprite']);
const LAYER_KEYS = Object.freeze(['count', 'layer']);
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export function assertVisualRegressionBaselineReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.deepEqual(Object.keys(report).sort(), ROOT_KEYS);
  assert.equal(report.visualRegressionBaselineReportVersion, 1);
  assert.equal(typeof report.scene, 'string');
  assert.equal(report.scene.trim().length > 0, true);
  assert.equal(Number.isInteger(report.tick), true);
  assert.equal(report.tick >= 0, true);

  assert.equal(typeof report.viewport, 'object');
  assert.notEqual(report.viewport, null);
  assert.deepEqual(Object.keys(report.viewport).sort(), VIEWPORT_KEYS);
  assert.equal(Number.isInteger(report.viewport.width), true);
  assert.equal(report.viewport.width >= 1, true);
  assert.equal(Number.isInteger(report.viewport.height), true);
  assert.equal(report.viewport.height >= 1, true);

  assert.equal(report.renderSnapshotVersion, 1);
  assert.equal(report.svgVersion, 1);
  assert.equal(report.hashAlgorithm, 'sha256');
  assert.match(report.snapshotHash, SHA256_HEX_PATTERN);
  assert.match(report.svgHash, SHA256_HEX_PATTERN);

  assert.equal(Number.isInteger(report.drawCallCount), true);
  assert.equal(report.drawCallCount >= 0, true);
  assert.equal(typeof report.drawCallsByKind, 'object');
  assert.notEqual(report.drawCallsByKind, null);
  assert.deepEqual(Object.keys(report.drawCallsByKind).sort(), DRAW_CALLS_BY_KIND_KEYS);
  assert.equal(Number.isInteger(report.drawCallsByKind.rect), true);
  assert.equal(report.drawCallsByKind.rect >= 0, true);
  assert.equal(Number.isInteger(report.drawCallsByKind.sprite), true);
  assert.equal(report.drawCallsByKind.sprite >= 0, true);
  assert.equal(report.drawCallsByKind.rect + report.drawCallsByKind.sprite, report.drawCallCount);

  assert.equal(Array.isArray(report.layers), true);
  let layerTotal = 0;
  let previousLayer;
  for (const layer of report.layers) {
    assert.equal(typeof layer, 'object');
    assert.notEqual(layer, null);
    assert.deepEqual(Object.keys(layer).sort(), LAYER_KEYS);
    assert.equal(Number.isInteger(layer.layer), true);
    assert.equal(Number.isInteger(layer.count), true);
    assert.equal(layer.count >= 1, true);
    if (previousLayer !== undefined) {
      assert.equal(layer.layer > previousLayer, true);
    }
    previousLayer = layer.layer;
    layerTotal += layer.count;
  }
  assert.equal(layerTotal, report.drawCallCount);

  assert.equal(Array.isArray(report.uniqueSpriteAssetIds), true);
  let previousAssetId;
  for (const assetId of report.uniqueSpriteAssetIds) {
    assert.equal(typeof assetId, 'string');
    assert.equal(assetId.trim().length > 0, true);
    if (previousAssetId !== undefined) {
      assert.equal(assetId > previousAssetId, true);
    }
    previousAssetId = assetId;
  }
}

export function assertVisualRegressionBaselineReportV1Rejects(report) {
  assert.throws(() => assertVisualRegressionBaselineReportV1(report));
}
