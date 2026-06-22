import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import {
  assertSceneTransitionReportV1,
  assertSceneTransitionReportV1Rejects
} from './helpers/assertSceneTransitionReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'scene-transition-report-v1.schema.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

function createSummary(name) {
  return {
    name,
    entityCount: 1,
    componentCount: 1,
    replicatedComponentCount: 0,
    systemCount: 1,
    assetRefCount: 0,
    systems: ['core.loop'],
    assetRefs: []
  };
}

function createValidReport() {
  return {
    sceneTransitionReportVersion: 1,
    ok: true,
    from: {
      path: path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-transition-source.scene.json'),
      ok: true,
      scene: 'scene-transition-source',
      summary: createSummary('scene-transition-source'),
      errors: [],
      warnings: []
    },
    to: {
      path: path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-transition-target.scene.json'),
      ok: true,
      scene: 'scene-transition-target',
      summary: createSummary('scene-transition-target'),
      errors: [],
      warnings: []
    },
    errors: [],
    warnings: []
  };
}

test('SceneTransitionReport v1 matches helper and schema', async () => {
  const report = createValidReport();

  assertSceneTransitionReportV1(report);

  const schema = await loadSchema();
  const errors = validateWithSchema(report, schema, {
    'scene-transition-report-v1.schema.json': { schema }
  });
  assert.deepEqual(errors, []);
});

test('SceneTransitionReport v1 rejects extra fields at controlled levels', async () => {
  const report = createValidReport();
  report.from.debug = true;
  report.to.errors.push({ path: '$.x', message: 'broken', code: 'EXTRA' });
  report.errors.push({ endpoint: 'bad', path: '$', message: 'bad endpoint' });
  report.debug = true;

  assertSceneTransitionReportV1Rejects(report);

  const schema = await loadSchema();
  const errors = validateWithSchema(report, schema, {
    'scene-transition-report-v1.schema.json': { schema }
  });

  assert.ok(errors.some((error) => error.path === '$.from.debug' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.to.errors[0].code' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.errors[0].endpoint' && error.message === 'must be one of: from, to, transition'));
  assert.ok(errors.some((error) => error.path === '$.debug' && error.message === 'is not allowed by schema'));
});

test('SceneTransitionReport v1 helper rejects inconsistent ok state', () => {
  const report = createValidReport();
  report.ok = false;

  assertSceneTransitionReportV1Rejects(report);
});

test('SceneTransitionReport v1 helper accepts invalid endpoint diagnostics', () => {
  const report = createValidReport();
  report.ok = false;
  report.to.ok = false;
  report.to.errors = [
    {
      path: '$.entities[0]',
      message: 'entity is invalid'
    }
  ];
  report.errors = [
    {
      endpoint: 'to',
      path: '$.entities[0]',
      message: 'entity is invalid'
    }
  ];

  assertSceneTransitionReportV1(report);
});
