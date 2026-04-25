import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateInputIntentV1File } from '../src/index.mjs';
import { assertInputIntentV1, assertInputIntentV1Rejects } from './helpers/assertInputIntentV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function inputFixturePath(relativePath) {
  return path.join(repoRoot, 'fixtures', 'input', relativePath);
}

test('input intent v1: valid fixture passes with deterministic action order', async () => {
  const validFixturePath = inputFixturePath('valid.move.intent.json');
  const fixture = JSON.parse(await readFile(validFixturePath, 'utf8'));

  assertInputIntentV1(fixture);

  const report = await validateInputIntentV1File(validFixturePath);
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.deepEqual(report.inputIntent, fixture);
  assert.deepEqual(
    report.inputIntent.actions.map((action) => `${action.type}:${action.axis.x},${action.axis.y}`),
    fixture.actions.map((action) => `${action.type}:${action.axis.x},${action.axis.y}`)
  );
});

test('input intent v1: invalid fixture fails predictably', async () => {
  const invalidFixturePath = inputFixturePath('invalid.missing-entity.intent.json');
  const fixture = JSON.parse(await readFile(invalidFixturePath, 'utf8'));

  assertInputIntentV1Rejects(fixture);

  const report = await validateInputIntentV1File(invalidFixturePath);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.entityId' && error.message === 'is required'));
});

test('input intent v1: rejects extra fields at controlled levels', async () => {
  const report = await validateInputIntentV1File(inputFixturePath('invalid.extra-field.intent.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.actions[0].debug' && error.message === 'is not allowed by schema'));
  assert.ok(report.errors.some((error) => error.path === '$.unexpected' && error.message === 'is not allowed by schema'));
});
