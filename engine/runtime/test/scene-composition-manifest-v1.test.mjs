import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildSceneCompositionManifestReportV1 } from '../src/index.mjs';
import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import {
  assertSceneCompositionManifestReportV1,
  assertSceneCompositionManifestReportV1Rejects
} from './helpers/assertSceneCompositionManifestReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-composition');
const manifestPath = path.join(fixtureDir, 'three-scene-composition.manifest.json');
const manifestSchemaPath = path.join(repoRoot, 'docs', 'schemas', 'scene-composition-manifest-v1.schema.json');
const reportSchemaPath = path.join(repoRoot, 'docs', 'schemas', 'scene-composition-manifest-report-v1.schema.json');

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

test('SceneCompositionManifest v1 fixture matches schema', async () => {
  const [manifest, schema] = await Promise.all([
    loadJson(manifestPath),
    loadJson(manifestSchemaPath)
  ]);

  const errors = validateWithSchema(manifest, schema, {
    'scene-composition-manifest-v1.schema.json': { schema }
  });
  assert.deepEqual(errors, []);
});

test('SceneCompositionManifestReport v1 matches helper and schema', async () => {
  const report = await buildSceneCompositionManifestReportV1(manifestPath);
  assertSceneCompositionManifestReportV1(report);

  const schema = await loadJson(reportSchemaPath);
  const errors = validateWithSchema(report, schema, {
    'scene-composition-manifest-report-v1.schema.json': { schema }
  });
  assert.deepEqual(errors, []);
});

test('SceneCompositionManifestReport v1 rejects extra fields at controlled levels', async () => {
  const report = await buildSceneCompositionManifestReportV1(manifestPath);
  report.scenes[0].debug = true;
  report.errors.push({ target: 'debug', ref: null, path: '$', message: 'bad target', code: 'EXTRA' });
  report.debug = true;

  assertSceneCompositionManifestReportV1Rejects(report);

  const schema = await loadJson(reportSchemaPath);
  const errors = validateWithSchema(report, schema, {
    'scene-composition-manifest-report-v1.schema.json': { schema }
  });

  assert.ok(errors.some((error) => error.path === '$.scenes[0].debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.errors[0].target' && error.message === 'must be one of: manifest, scene'));
  assert.ok(errors.some((error) => error.path === '$.errors[0].code' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.debug' && error.message === 'is not allowed by schema'));
});

test('SceneCompositionManifestReport v1 helper rejects inconsistent entry data', async () => {
  const report = await buildSceneCompositionManifestReportV1(manifestPath);
  report.entryScenePath = path.join(fixtureDir, 'town.scene.json');

  assertSceneCompositionManifestReportV1Rejects(report);
});
