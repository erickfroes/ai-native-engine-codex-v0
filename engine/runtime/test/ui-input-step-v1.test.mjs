import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import { buildUiInputStepReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'ui-input-step-report-v1.schema.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

test('UiInputStepReport v1 schema accepts an authored step report', async () => {
  const schema = await loadSchema();
  const report = await buildUiInputStepReportV1(actionScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 1, y: 0 }
        }
      ]
    }
  });
  const errors = validateWithSchema(report, schema, {
    'ui-input-step-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});

test('UiInputStepReport v1 schema accepts no-action scenes', async () => {
  const schema = await loadSchema();
  const report = await buildUiInputStepReportV1(productionScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 1, y: 0 }
        }
      ]
    }
  });
  const errors = validateWithSchema(report, schema, {
    'ui-input-step-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});

test('UiInputStepReport v1 schema accepts zero-move/no-ui-screen reports', async () => {
  const schema = await loadSchema();
  const report = await buildUiInputStepReportV1(tutorialScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 2,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 0, y: 0 }
        }
      ]
    }
  });
  const errors = validateWithSchema(report, schema, {
    'ui-input-step-report-v1.schema.json': { schema }
  });

  assert.deepEqual(errors, []);
});
