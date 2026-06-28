import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import { buildUiLocalScreenStateReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'ui-local-screen-state-report-v1.schema.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

test('UiLocalScreenStateReport v1 schema accepts an authored UI local state report', async () => {
  const schema = await loadSchema();
  const report = await buildUiLocalScreenStateReportV1(actionScenePath);
  const errors = validateWithSchema(report, schema, {
    'ui-local-screen-state-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});

test('UiLocalScreenStateReport v1 schema accepts a scene with no active UI scope', async () => {
  const schema = await loadSchema();
  const report = await buildUiLocalScreenStateReportV1(tutorialScenePath);
  const errors = validateWithSchema(report, schema, {
    'ui-local-screen-state-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});
