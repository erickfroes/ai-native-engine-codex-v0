import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import { buildUiNavigationFocusReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'ui-navigation-focus-report-v1.schema.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

test('UiNavigationFocusReport v1 schema accepts a production report', async () => {
  const schema = await loadSchema();
  const report = await buildUiNavigationFocusReportV1(productionScenePath);
  const errors = validateWithSchema(report, schema, {
    'ui-navigation-focus-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});

test('UiNavigationFocusReport v1 schema accepts a scene with no focus scope', async () => {
  const schema = await loadSchema();
  const report = await buildUiNavigationFocusReportV1(tutorialScenePath);
  const errors = validateWithSchema(report, schema, {
    'ui-navigation-focus-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});
