import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildAtlasMaterialManifestReportV1 } from '../src/index.mjs';
import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import {
  assertAtlasMaterialManifestReportV1,
  assertAtlasMaterialManifestReportV1Rejects
} from './helpers/assertAtlasMaterialManifestReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'atlas-material');
const manifestPath = path.join(fixtureDir, 'starter.atlas-material.json');
const manifestSchemaPath = path.join(repoRoot, 'docs', 'schemas', 'atlas-material-manifest-v1.schema.json');
const reportSchemaPath = path.join(repoRoot, 'docs', 'schemas', 'atlas-material-manifest-report-v1.schema.json');

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

test('AtlasMaterialManifest v1 fixture matches schema', async () => {
  const [manifest, schema] = await Promise.all([
    loadJson(manifestPath),
    loadJson(manifestSchemaPath)
  ]);

  const errors = validateWithSchema(manifest, schema, {
    'atlas-material-manifest-v1.schema.json': { schema }
  });
  assert.deepEqual(errors, []);
});

test('AtlasMaterialManifestReport v1 matches helper and schema', async () => {
  const report = await buildAtlasMaterialManifestReportV1(manifestPath);
  assertAtlasMaterialManifestReportV1(report);

  const schema = await loadJson(reportSchemaPath);
  const errors = validateWithSchema(report, schema, {
    'atlas-material-manifest-report-v1.schema.json': { schema }
  });
  assert.deepEqual(errors, []);
});

test('AtlasMaterialManifestReport v1 rejects extra fields at controlled levels', async () => {
  const report = await buildAtlasMaterialManifestReportV1(manifestPath);
  report.debug = true;
  report.summary.debug = true;
  report.atlases[0].debug = true;
  report.regions[0].debug = true;
  report.materials[0].debug = true;
  report.spriteBindings[0].debug = true;
  report.tileBindings[0].debug = true;
  report.errors.push({ target: 'debug', ref: null, path: '$', message: 'bad target', code: 'EXTRA' });

  assertAtlasMaterialManifestReportV1Rejects(report);

  const schema = await loadJson(reportSchemaPath);
  const errors = validateWithSchema(report, schema, {
    'atlas-material-manifest-report-v1.schema.json': { schema }
  });

  assert.ok(errors.some((error) => error.path === '$.debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.summary.debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.atlases[0].debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.regions[0].debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.materials[0].debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.spriteBindings[0].debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.tileBindings[0].debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.errors[0].target' && error.message.includes('must be one of')));
  assert.ok(errors.some((error) => error.path === '$.errors[0].code' && error.message === 'is not allowed by schema'));
});
