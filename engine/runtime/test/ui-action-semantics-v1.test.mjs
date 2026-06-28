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
const componentSchemaPath = path.join(repoRoot, 'schemas', 'component.schema.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

async function loadComponentSchema() {
  return JSON.parse(await readFile(componentSchemaPath, 'utf8'));
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

test('component schema formally describes ui.action.semantics v1', async () => {
  const schema = await loadComponentSchema();
  const componentShape = schema.allOf.find(
    (entry) => entry?.if?.properties?.kind?.const === 'ui.action.semantics'
  );

  assert.ok(componentShape, 'expected ui.action.semantics branch in component.schema.json');
  assert.deepEqual(componentShape.then.properties.kind, { const: 'ui.action.semantics' });
  assert.deepEqual(componentShape.then.properties.version, { const: 1 });
  assert.deepEqual(componentShape.then.properties.replicated, { const: false });
  assert.deepEqual(componentShape.then.properties.fields.required, ['screenId', 'actions']);
  assert.deepEqual(componentShape.then.properties.fields.properties.screenId, {
    type: 'string',
    minLength: 1
  });
  assert.deepEqual(componentShape.then.properties.fields.properties.initialFocusWidgetId, {
    type: 'string',
    minLength: 1
  });
  assert.equal(componentShape.then.properties.fields.properties.actions.type, 'array');
  assert.equal(componentShape.then.properties.fields.properties.actions.minItems, 1);
  assert.deepEqual(componentShape.then.properties.fields.properties.actions.items.required, [
    'widgetId',
    'actionId'
  ]);
  assert.deepEqual(
    componentShape.then.properties.fields.properties.actions.items.properties.widgetId,
    {
      type: 'string',
      minLength: 1
    }
  );
  assert.deepEqual(
    componentShape.then.properties.fields.properties.actions.items.properties.actionId,
    {
      type: 'string',
      minLength: 1
    }
  );
  assert.equal(componentShape.then.properties.fields.additionalProperties, false);
  assert.equal(
    componentShape.then.properties.fields.properties.actions.items.additionalProperties,
    false
  );
});
