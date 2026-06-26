import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze([
  'absolutePath',
  'assetManifestAbsolutePath',
  'assetManifestPath',
  'atlasMaterialManifestReportVersion',
  'atlases',
  'errors',
  'manifest',
  'materials',
  'ok',
  'regions',
  'spriteBindings',
  'summary',
  'tileBindings',
  'warnings'
]);
const SUMMARY_KEYS = Object.freeze([
  'assetCount',
  'atlasCount',
  'materialCount',
  'referencedAssetIds',
  'referencedMaterialIds',
  'regionCount',
  'spriteBindingCount',
  'tileBindingCount'
]);
const ATLAS_KEYS = Object.freeze([
  'assetFound',
  'assetHeight',
  'assetId',
  'assetWidth',
  'errors',
  'id',
  'ok',
  'regionCount',
  'warnings'
]);
const REGION_KEYS = Object.freeze([
  'assetId',
  'atlasId',
  'errors',
  'height',
  'id',
  'ok',
  'warnings',
  'width',
  'x',
  'y'
]);
const MATERIAL_KEYS = Object.freeze([
  'alphaMode',
  'errors',
  'id',
  'kind',
  'ok',
  'sampler',
  'warnings'
]);
const BINDING_KEYS = Object.freeze([
  'atlasFound',
  'atlasId',
  'errors',
  'id',
  'materialFound',
  'materialId',
  'ok',
  'regionFound',
  'regionId',
  'warnings'
]);
const MESSAGE_KEYS = Object.freeze(['message', 'path']);
const ROOT_MESSAGE_KEYS = Object.freeze(['message', 'path', 'ref', 'target']);
const VALID_TARGETS = new Set([
  'manifest',
  'assetManifest',
  'atlas',
  'region',
  'material',
  'spriteBinding',
  'tileBinding'
]);

function assertStringOrNull(value) {
  if (value === null) {
    return;
  }

  assert.equal(typeof value, 'string');
  assert.equal(value.trim().length > 0, true);
}

function assertIntegerOrNull(value, minimum) {
  if (value === null) {
    return;
  }

  assert.equal(Number.isInteger(value), true);
  assert.equal(value >= minimum, true);
}

function assertMessage(message) {
  assert.equal(typeof message, 'object');
  assert.notEqual(message, null);
  assert.deepEqual(Object.keys(message).sort(), MESSAGE_KEYS);
  assert.equal(typeof message.path, 'string');
  assert.equal(message.path.trim().length > 0, true);
  assert.equal(typeof message.message, 'string');
  assert.equal(message.message.trim().length > 0, true);
}

function assertRootMessage(message) {
  assert.equal(typeof message, 'object');
  assert.notEqual(message, null);
  assert.deepEqual(Object.keys(message).sort(), ROOT_MESSAGE_KEYS);
  assert.equal(VALID_TARGETS.has(message.target), true);
  assert.equal(typeof message.path, 'string');
  assert.equal(message.path.trim().length > 0, true);
  assert.equal(typeof message.message, 'string');
  assert.equal(message.message.trim().length > 0, true);
  assertStringOrNull(message.ref);
}

function assertMessageArray(messages) {
  assert.equal(Array.isArray(messages), true);
  for (const message of messages) {
    assertMessage(message);
  }
}

function assertSummary(summary, report) {
  assert.equal(typeof summary, 'object');
  assert.notEqual(summary, null);
  assert.deepEqual(Object.keys(summary).sort(), SUMMARY_KEYS);

  for (const key of [
    'assetCount',
    'atlasCount',
    'regionCount',
    'materialCount',
    'spriteBindingCount',
    'tileBindingCount'
  ]) {
    assert.equal(Number.isInteger(summary[key]), true);
    assert.equal(summary[key] >= 0, true);
  }

  assert.equal(Array.isArray(summary.referencedAssetIds), true);
  assert.equal(Array.isArray(summary.referencedMaterialIds), true);
  assert.deepEqual([...summary.referencedAssetIds].sort(), summary.referencedAssetIds);
  assert.deepEqual([...summary.referencedMaterialIds].sort(), summary.referencedMaterialIds);
  assert.equal(summary.atlasCount, report.atlases.length);
  assert.equal(summary.regionCount, report.regions.length);
  assert.equal(summary.materialCount, report.materials.length);
  assert.equal(summary.spriteBindingCount, report.spriteBindings.length);
  assert.equal(summary.tileBindingCount, report.tileBindings.length);
}

function assertAtlas(atlas) {
  assert.equal(typeof atlas, 'object');
  assert.notEqual(atlas, null);
  assert.deepEqual(Object.keys(atlas).sort(), ATLAS_KEYS);
  assertStringOrNull(atlas.id);
  assertStringOrNull(atlas.assetId);
  assert.equal(typeof atlas.assetFound, 'boolean');
  assertIntegerOrNull(atlas.assetWidth, 1);
  assertIntegerOrNull(atlas.assetHeight, 1);
  assert.equal(Number.isInteger(atlas.regionCount), true);
  assert.equal(atlas.regionCount >= 0, true);
  assert.equal(typeof atlas.ok, 'boolean');
  assertMessageArray(atlas.errors);
  assertMessageArray(atlas.warnings);
}

function assertRegion(region) {
  assert.equal(typeof region, 'object');
  assert.notEqual(region, null);
  assert.deepEqual(Object.keys(region).sort(), REGION_KEYS);
  assertStringOrNull(region.atlasId);
  assertStringOrNull(region.id);
  assertStringOrNull(region.assetId);
  assertIntegerOrNull(region.x, 0);
  assertIntegerOrNull(region.y, 0);
  assertIntegerOrNull(region.width, 1);
  assertIntegerOrNull(region.height, 1);
  assert.equal(typeof region.ok, 'boolean');
  assertMessageArray(region.errors);
  assertMessageArray(region.warnings);
  assert.equal(region.ok, region.errors.length === 0);
}

function assertMaterial(material) {
  assert.equal(typeof material, 'object');
  assert.notEqual(material, null);
  assert.deepEqual(Object.keys(material).sort(), MATERIAL_KEYS);
  assertStringOrNull(material.id);
  assertStringOrNull(material.kind);
  assertStringOrNull(material.sampler);
  assertStringOrNull(material.alphaMode);
  assert.equal(typeof material.ok, 'boolean');
  assertMessageArray(material.errors);
  assertMessageArray(material.warnings);
  assert.equal(material.ok, material.errors.length === 0);
}

function assertBinding(binding) {
  assert.equal(typeof binding, 'object');
  assert.notEqual(binding, null);
  assert.deepEqual(Object.keys(binding).sort(), BINDING_KEYS);
  assertStringOrNull(binding.id);
  assertStringOrNull(binding.atlasId);
  assertStringOrNull(binding.regionId);
  assertStringOrNull(binding.materialId);
  assert.equal(typeof binding.atlasFound, 'boolean');
  assert.equal(typeof binding.regionFound, 'boolean');
  assert.equal(typeof binding.materialFound, 'boolean');
  assert.equal(typeof binding.ok, 'boolean');
  assertMessageArray(binding.errors);
  assertMessageArray(binding.warnings);
  assert.equal(binding.ok, binding.errors.length === 0);
}

export function assertAtlasMaterialManifestReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.deepEqual(Object.keys(report).sort(), ROOT_KEYS);
  assert.equal(report.atlasMaterialManifestReportVersion, 1);
  assert.equal(typeof report.ok, 'boolean');
  assert.equal(typeof report.absolutePath, 'string');
  assert.equal(report.absolutePath.trim().length > 0, true);
  assertStringOrNull(report.assetManifestPath);
  assertStringOrNull(report.assetManifestAbsolutePath);
  if (report.manifest !== null) {
    assert.equal(typeof report.manifest, 'object');
  }

  assert.equal(Array.isArray(report.atlases), true);
  assert.equal(Array.isArray(report.regions), true);
  assert.equal(Array.isArray(report.materials), true);
  assert.equal(Array.isArray(report.spriteBindings), true);
  assert.equal(Array.isArray(report.tileBindings), true);
  for (const atlas of report.atlases) {
    assertAtlas(atlas);
  }
  for (const region of report.regions) {
    assertRegion(region);
  }
  for (const material of report.materials) {
    assertMaterial(material);
  }
  for (const binding of report.spriteBindings) {
    assertBinding(binding);
  }
  for (const binding of report.tileBindings) {
    assertBinding(binding);
  }

  assertSummary(report.summary, report);
  assert.equal(Array.isArray(report.errors), true);
  assert.equal(Array.isArray(report.warnings), true);
  for (const error of report.errors) {
    assertRootMessage(error);
  }
  for (const warning of report.warnings) {
    assertRootMessage(warning);
  }
  assert.equal(report.ok, report.errors.length === 0);
}

export function assertAtlasMaterialManifestReportV1Rejects(report) {
  assert.throws(() => assertAtlasMaterialManifestReportV1(report));
}
