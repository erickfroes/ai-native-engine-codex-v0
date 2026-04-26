import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  validateAssetManifestV1File,
  loadValidatedAssetManifestV1
} from '../src/index.mjs';
import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import { assertAssetManifestV1, assertAssetManifestV1Rejects } from './helpers/assertAssetManifestV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'asset-manifest-v1.schema.json');

function assetFixturePath(relativePath) {
  return path.join(repoRoot, 'fixtures', 'assets', relativePath);
}

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

test('asset manifest v1: valid fixture passes with deterministic shape', async () => {
  const validFixturePath = assetFixturePath('valid.asset-manifest.json');
  const fixture = JSON.parse(await readFile(validFixturePath, 'utf8'));

  assertAssetManifestV1(fixture);

  const report = await validateAssetManifestV1File(validFixturePath);
  assert.equal(report.ok, true);
  assert.equal(report.absolutePath, validFixturePath);
  assert.deepEqual(report.assetManifest, fixture);
  assert.deepEqual(report.errors, []);

  const schema = await loadSchema();
  const errors = validateWithSchema(fixture, schema, { 'asset-manifest-v1.schema.json': { schema } });
  assert.deepEqual(errors, []);
});

test('asset manifest v1: rejects duplicate ids predictably', async () => {
  const invalidFixturePath = assetFixturePath('invalid.duplicate-id.asset-manifest.json');
  const fixture = JSON.parse(await readFile(invalidFixturePath, 'utf8'));

  assertAssetManifestV1Rejects(fixture);

  const report = await validateAssetManifestV1File(invalidFixturePath);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.assets[1].id' && error.message === 'duplicate asset id: player.sprite'));
});

test('asset manifest v1: rejects absolute src predictably', async () => {
  const invalidFixturePath = assetFixturePath('invalid.absolute-src.asset-manifest.json');
  const fixture = JSON.parse(await readFile(invalidFixturePath, 'utf8'));

  assertAssetManifestV1Rejects(fixture);

  const report = await validateAssetManifestV1File(invalidFixturePath);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      path: '$.assets[0].src',
      message: 'must be a relative path'
    }
  ]);
});

test('asset manifest v1: rejects traversal src predictably', async () => {
  const invalidFixturePath = assetFixturePath('invalid.traversal-src.asset-manifest.json');
  const fixture = JSON.parse(await readFile(invalidFixturePath, 'utf8'));

  assertAssetManifestV1Rejects(fixture);

  const report = await validateAssetManifestV1File(invalidFixturePath);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      path: '$.assets[0].src',
      message: 'must stay inside the manifest directory'
    }
  ]);
});

test('asset manifest v1: rejects extra fields at controlled levels', async () => {
  const invalidFixturePath = assetFixturePath('invalid.extra-field.asset-manifest.json');
  const fixture = JSON.parse(await readFile(invalidFixturePath, 'utf8'));

  assertAssetManifestV1Rejects(fixture);

  const report = await validateAssetManifestV1File(invalidFixturePath);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.assets[0].label' && error.message === 'is not allowed by schema'));
  assert.ok(report.errors.some((error) => error.path === '$.rootDebug' && error.message === 'is not allowed by schema'));
});

test('asset manifest v1: validated loader throws stable error for invalid manifest', async () => {
  await assert.rejects(
    () => loadValidatedAssetManifestV1(assetFixturePath('invalid.traversal-src.asset-manifest.json')),
    /asset manifest is invalid: \$\.assets\[0\]\.src: must stay inside the manifest directory/
  );
});
