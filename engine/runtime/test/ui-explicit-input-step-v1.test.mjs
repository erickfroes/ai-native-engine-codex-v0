import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import {
  buildUiExplicitInputStepReportV1,
  loadValidatedUiExplicitInputV1
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'ui-explicit-input-step-report-v1.schema.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const navigateNextPath = path.join(repoRoot, 'fixtures', 'ui-input', 'navigate-next.ui-explicit-input.json');
const activatePath = path.join(repoRoot, 'fixtures', 'ui-input', 'activate.ui-explicit-input.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

async function loadUiExplicitInput(uiInputPath) {
  return loadValidatedUiExplicitInputV1(uiInputPath);
}

test('UiExplicitInputStepReport v1 schema accepts authored explicit input reports', async () => {
  const schema = await loadSchema();
  const uiExplicitInput = await loadUiExplicitInput(navigateNextPath);
  const report = await buildUiExplicitInputStepReportV1(actionScenePath, { uiExplicitInput });
  const errors = validateWithSchema(report, schema, {
    'ui-explicit-input-step-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});

test('UiExplicitInputStepReport v1 schema accepts no-action and no-ui reports', async () => {
  const schema = await loadSchema();
  const uiExplicitInput = await loadUiExplicitInput(activatePath);
  const noActionReport = await buildUiExplicitInputStepReportV1(productionScenePath, { uiExplicitInput });
  const noUiReport = await buildUiExplicitInputStepReportV1(tutorialScenePath, { uiExplicitInput });

  assert.deepEqual(validateWithSchema(noActionReport, schema, {
    'ui-explicit-input-step-report-v1.schema.json': { schema }
  }), []);
  assert.deepEqual(validateWithSchema(noUiReport, schema, {
    'ui-explicit-input-step-report-v1.schema.json': { schema }
  }), []);
});

test('UiExplicitInputStepReport v1 schema rejects extra fields at controlled levels', async () => {
  const schema = await loadSchema();
  const uiExplicitInput = await loadUiExplicitInput(navigateNextPath);
  const report = await buildUiExplicitInputStepReportV1(actionScenePath, { uiExplicitInput });

  report.debug = true;
  report.actionCandidates[0].label = 'debug';

  const errors = validateWithSchema(report, schema, {
    'ui-explicit-input-step-report-v1.schema.json': { schema }
  });

  assert.ok(errors.some((error) => error.path === '$.debug' && error.message === 'is not allowed by schema'));
  assert.ok(
    errors.some((error) => error.path === '$.actionCandidates[0].label' && error.message === 'is not allowed by schema')
  );
});
