import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['assetManifestVersion', 'assets']);
const ASSET_KEYS = Object.freeze(['height', 'id', 'src', 'type', 'width']);

export function assertAssetManifestV1(assetManifest) {
  assert.equal(typeof assetManifest, 'object');
  assert.notEqual(assetManifest, null);
  assert.deepEqual(Object.keys(assetManifest).sort(), ROOT_KEYS);
  assert.equal(assetManifest.assetManifestVersion, 1);
  assert.equal(Array.isArray(assetManifest.assets), true);

  const seenIds = new Set();
  for (const asset of assetManifest.assets) {
    assert.equal(typeof asset, 'object');
    assert.notEqual(asset, null);
    assert.deepEqual(Object.keys(asset).sort(), ASSET_KEYS);
    assert.equal(typeof asset.id, 'string');
    assert.equal(asset.id.trim().length > 0, true);
    assert.equal(seenIds.has(asset.id), false);
    seenIds.add(asset.id);
    assert.equal(asset.type, 'image');
    assert.equal(typeof asset.src, 'string');
    assert.equal(asset.src.trim().length > 0, true);
    assert.equal(pathIsRelative(asset.src), true);
    assert.equal(Number.isInteger(asset.width), true);
    assert.equal(asset.width >= 1, true);
    assert.equal(Number.isInteger(asset.height), true);
    assert.equal(asset.height >= 1, true);
  }
}

function pathIsRelative(value) {
  return !/^(?:[A-Za-z]:[\\/]|\/)/.test(value) && !value.startsWith('..');
}

export function assertAssetManifestV1Rejects(assetManifest) {
  assert.throws(() => assertAssetManifestV1(assetManifest));
}
