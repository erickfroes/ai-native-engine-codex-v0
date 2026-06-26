import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAtlasMaterialManifestReportV1 } from '../src/index.mjs';
import { assertAtlasMaterialManifestReportV1 } from './helpers/assertAtlasMaterialManifestReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'atlas-material');
const validManifestPath = path.join(fixtureDir, 'starter.atlas-material.json');
const duplicateMaterialPath = path.join(fixtureDir, 'invalid-duplicate-material.atlas-material.json');
const unsafePath = path.join(fixtureDir, 'invalid-unsafe-path.atlas-material.json');
const missingAssetRefPath = path.join(fixtureDir, 'invalid-missing-asset-ref.atlas-material.json');
const missingBindingRefPath = path.join(fixtureDir, 'invalid-missing-region-or-material-ref.atlas-material.json');
const outOfBoundsRegionPath = path.join(fixtureDir, 'invalid-out-of-bounds-region.atlas-material.json');
const warningOrphanRegionPath = path.join(fixtureDir, 'warning-orphan-region.atlas-material.json');
const malformedPath = path.join(fixtureDir, 'invalid-malformed.atlas-material.json');
const missingPath = path.join(fixtureDir, 'missing.atlas-material.json');
const assetManifestPath = path.join(fixtureDir, 'atlas-material.asset-manifest.json');

test('buildAtlasMaterialManifestReportV1 returns deterministic atlas/material summaries', async () => {
  const first = await buildAtlasMaterialManifestReportV1(validManifestPath);
  const second = await buildAtlasMaterialManifestReportV1(validManifestPath);

  assert.deepEqual(first, second);
  assertAtlasMaterialManifestReportV1(first);
  assert.equal(first.ok, true);
  assert.equal(first.assetManifestPath, 'atlas-material.asset-manifest.json');
  assert.equal(first.assetManifestAbsolutePath, assetManifestPath);
  assert.deepEqual(first.summary, {
    assetCount: 1,
    atlasCount: 1,
    regionCount: 2,
    materialCount: 2,
    spriteBindingCount: 1,
    tileBindingCount: 1,
    referencedAssetIds: ['atlas.world'],
    referencedMaterialIds: ['pixel.sprite', 'pixel.tile']
  });
  assert.deepEqual(first.errors, []);
  assert.deepEqual(first.warnings, []);
  assert.deepEqual(first.atlases.map((atlas) => atlas.id), ['world.main']);
  assert.deepEqual(first.regions.map((region) => `${region.atlasId}#${region.id}`), [
    'world.main#player.idle',
    'world.main#tile.grass'
  ]);
  assert.deepEqual(first.materials.map((material) => material.id), ['pixel.sprite', 'pixel.tile']);
});

test('buildAtlasMaterialManifestReportV1 reports duplicate ids and missing material refs predictably', async () => {
  const report = await buildAtlasMaterialManifestReportV1(duplicateMaterialPath);

  assertAtlasMaterialManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      target: 'material',
      ref: 'pixel.sprite',
      path: '$.materials[1].id',
      message: 'duplicate material id: pixel.sprite'
    },
    {
      target: 'spriteBinding',
      ref: 'player.hero',
      path: '$.sprites[0].materialId',
      message: 'unknown material id: pixel.missing'
    }
  ]);
});

test('buildAtlasMaterialManifestReportV1 validates asset manifest path safety predictably', async () => {
  const report = await buildAtlasMaterialManifestReportV1(unsafePath);

  assertAtlasMaterialManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.equal(report.assetManifestPath, null);
  assert.equal(report.assetManifestAbsolutePath, null);
  assert.deepEqual(report.errors, [
    {
      target: 'assetManifest',
      ref: null,
      path: '$.assetManifestPath',
      message: 'must be a safe relative path'
    }
  ]);
});

test('buildAtlasMaterialManifestReportV1 reports missing asset refs predictably', async () => {
  const report = await buildAtlasMaterialManifestReportV1(missingAssetRefPath);

  assertAtlasMaterialManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      target: 'atlas',
      ref: 'world.main',
      path: '$.atlases[0].assetId',
      message: 'referenced assetId not found in asset manifest: atlas.missing'
    }
  ]);
});

test('buildAtlasMaterialManifestReportV1 reports missing binding refs predictably', async () => {
  const report = await buildAtlasMaterialManifestReportV1(missingBindingRefPath);

  assertAtlasMaterialManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      target: 'spriteBinding',
      ref: 'player.hero',
      path: '$.sprites[0].materialId',
      message: 'unknown material id: pixel.missing'
    },
    {
      target: 'spriteBinding',
      ref: 'player.hero',
      path: '$.sprites[0].regionId',
      message: 'unknown region id: player.missing for atlas world.main'
    }
  ]);
});

test('buildAtlasMaterialManifestReportV1 reports out-of-bounds regions predictably', async () => {
  const report = await buildAtlasMaterialManifestReportV1(outOfBoundsRegionPath);

  assertAtlasMaterialManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      target: 'region',
      ref: 'world.main#player.big',
      path: '$.atlases[0].regions[0]',
      message: 'region must stay inside atlas asset bounds'
    }
  ]);
});

test('buildAtlasMaterialManifestReportV1 reports orphan regions as warnings without failing', async () => {
  const report = await buildAtlasMaterialManifestReportV1(warningOrphanRegionPath);

  assertAtlasMaterialManifestReportV1(report);
  assert.equal(report.ok, true);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, [
    {
      target: 'region',
      ref: 'world.main#unused.region',
      path: '$.atlases[].regions[]',
      message: 'region is not referenced by any sprite or tile binding'
    }
  ]);
});

test('buildAtlasMaterialManifestReportV1 reports malformed and missing manifests predictably', async () => {
  const malformed = await buildAtlasMaterialManifestReportV1(malformedPath);
  const missing = await buildAtlasMaterialManifestReportV1(missingPath);

  assertAtlasMaterialManifestReportV1(malformed);
  assertAtlasMaterialManifestReportV1(missing);
  assert.deepEqual(malformed.errors, [
    {
      target: 'manifest',
      ref: null,
      path: '$',
      message: 'atlas/material manifest JSON is malformed'
    }
  ]);
  assert.deepEqual(missing.errors, [
    {
      target: 'manifest',
      ref: null,
      path: '$',
      message: 'atlas/material manifest file was not found'
    }
  ]);
});

test('buildAtlasMaterialManifestReportV1 validates input shape predictably', async () => {
  await assert.rejects(
    () => buildAtlasMaterialManifestReportV1(''),
    /buildAtlasMaterialManifestReportV1: `manifestPath` must be a non-empty string/
  );
});
