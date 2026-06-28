import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import { buildUiActionSemanticsReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'ui-action-semantics-report-v1.schema.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

test('UiActionSemanticsReport v1 schema accepts an authored action semantics report', async () => {
  const schema = await loadSchema();
  const report = await buildUiActionSemanticsReportV1(actionScenePath);
  const errors = validateWithSchema(report, schema, {
    'ui-action-semantics-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});

test('UiActionSemanticsReport v1 schema accepts a scene with no active scope', async () => {
  const schema = await loadSchema();
  const report = await buildUiActionSemanticsReportV1(tutorialScenePath);
  const errors = validateWithSchema(report, schema, {
    'ui-action-semantics-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});
