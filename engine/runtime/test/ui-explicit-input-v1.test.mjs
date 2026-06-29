import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createUiExplicitInputFromKeyboardV1,
  validateUiExplicitInputV1File
} from '../src/index.mjs';
import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import {
  assertUiExplicitInputV1,
  assertUiExplicitInputV1Rejects
} from './helpers/assertUiExplicitInputV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'ui-explicit-input-v1.schema.json');

function uiInputFixturePath(relativePath) {
  return path.join(repoRoot, 'fixtures', 'ui-input', relativePath);
}

async function loadJson(jsonPath) {
  return JSON.parse(await readFile(jsonPath, 'utf8'));
}

test('UiExplicitInput v1 valid fixtures pass schema and runtime validation', async () => {
  const schema = await loadJson(schemaPath);
  const fixtureNames = [
    'navigate-next.ui-explicit-input.json',
    'navigate-previous.ui-explicit-input.json',
    'activate.ui-explicit-input.json'
  ];

  for (const fixtureName of fixtureNames) {
    const fixturePath = uiInputFixturePath(fixtureName);
    const fixture = await loadJson(fixturePath);
    const schemaErrors = validateWithSchema(fixture, schema, {
      'ui-explicit-input-v1.schema.json': { schema }
    });
    const report = await validateUiExplicitInputV1File(fixturePath);

    assert.deepEqual(schemaErrors, []);
    assertUiExplicitInputV1(fixture);
    assert.equal(report.ok, true);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.uiExplicitInput, fixture);
  }
});

test('UiExplicitInput v1 invalid fixtures fail predictably', async () => {
  const invalidCases = [
    {
      fixtureName: 'invalid.version.ui-explicit-input.json',
      expectedPath: '$.uiExplicitInputVersion',
      expectedMessage: 'must be 1'
    },
    {
      fixtureName: 'invalid.unknown-type.ui-explicit-input.json',
      expectedPath: '$.action.type',
      expectedMessage: 'must be one of: navigate, activate'
    },
    {
      fixtureName: 'invalid.navigate-missing-direction.ui-explicit-input.json',
      expectedPath: '$.action.direction',
      expectedMessage: 'is required for navigate'
    },
    {
      fixtureName: 'invalid.navigate-zero-direction.ui-explicit-input.json',
      expectedPath: '$.action.direction',
      expectedMessage: 'must be one of: previous, next'
    },
    {
      fixtureName: 'invalid.activate-with-direction.ui-explicit-input.json',
      expectedPath: '$.action.direction',
      expectedMessage: 'is not allowed for activate'
    },
    {
      fixtureName: 'invalid.missing-action.ui-explicit-input.json',
      expectedPath: '$.action',
      expectedMessage: 'is required'
    }
  ];

  for (const { fixtureName, expectedPath, expectedMessage } of invalidCases) {
    const fixturePath = uiInputFixturePath(fixtureName);
    const fixture = await loadJson(fixturePath);
    const report = await validateUiExplicitInputV1File(fixturePath);

    assertUiExplicitInputV1Rejects(fixture);
    assert.equal(report.ok, false);
    assert.ok(
      report.errors.some((error) => error.path === expectedPath && error.message === expectedMessage),
      `${fixtureName} should contain ${expectedPath}: ${expectedMessage}`
    );
  }
});

test('UiExplicitInput v1 rejects extra fields at controlled levels', async () => {
  const report = await validateUiExplicitInputV1File(uiInputFixturePath('invalid.extra-field.ui-explicit-input.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.action.debug' && error.message === 'is not allowed by schema'));
  assert.ok(report.errors.some((error) => error.path === '$.unexpected' && error.message === 'is not allowed by schema'));
});

test('UI explicit keyboard translator maps unambiguous keys to one deterministic action', () => {
  assert.deepEqual(createUiExplicitInputFromKeyboardV1({ tick: 1, keys: ['ArrowRight'] }), {
    uiExplicitInputVersion: 1,
    tick: 1,
    action: {
      type: 'navigate',
      direction: 'next'
    }
  });

  assert.deepEqual(createUiExplicitInputFromKeyboardV1({ tick: 2, keys: ['ArrowUp'] }), {
    uiExplicitInputVersion: 1,
    tick: 2,
    action: {
      type: 'navigate',
      direction: 'previous'
    }
  });

  assert.deepEqual(createUiExplicitInputFromKeyboardV1({ tick: 3, keys: ['Enter'] }), {
    uiExplicitInputVersion: 1,
    tick: 3,
    action: {
      type: 'activate'
    }
  });
});

test('UI explicit keyboard translator rejects ambiguous or empty input', () => {
  assert.throws(
    () => createUiExplicitInputFromKeyboardV1({ tick: 0, keys: ['ArrowRight'] }),
    /`tick` must be an integer >= 1/
  );
  assert.throws(
    () => createUiExplicitInputFromKeyboardV1({ tick: 1, keys: [] }),
    /`keys` must be a non-empty array of strings/
  );
  assert.throws(
    () => createUiExplicitInputFromKeyboardV1({ tick: 1, keys: ['ArrowRight', ''] }),
    /`keys` must contain only non-empty strings/
  );
  assert.throws(
    () => createUiExplicitInputFromKeyboardV1({ tick: 1, keys: ['ArrowLeft', 'ArrowRight'] }),
    /must resolve to navigate or activate/
  );
  assert.throws(
    () => createUiExplicitInputFromKeyboardV1({ tick: 1, keys: ['Enter', 'ArrowRight'] }),
    /must not mix activate and navigate inputs/
  );
  assert.throws(
    () => createUiExplicitInputFromKeyboardV1({ tick: 1, keys: ['UnknownKey'] }),
    /must resolve to navigate or activate/
  );
});
