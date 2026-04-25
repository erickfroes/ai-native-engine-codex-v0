import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  validateKeyboardInputScriptV1,
  validateKeyboardInputScriptV1File
} from '../src/index.mjs';
import {
  assertKeyboardInputScriptV1,
  assertKeyboardInputScriptV1Rejects
} from './helpers/assertKeyboardInputScriptV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function inputScriptFixturePath(relativePath) {
  return path.join(repoRoot, 'fixtures', 'input-script', relativePath);
}

test('keyboard input script v1: valid fixture passes with deterministic tick order', async () => {
  const validFixturePath = inputScriptFixturePath('valid.keyboard-input-script.json');
  const fixture = JSON.parse(await readFile(validFixturePath, 'utf8'));

  assertKeyboardInputScriptV1(fixture);

  const report = await validateKeyboardInputScriptV1File(validFixturePath);
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.deepEqual(report.keyboardInputScript, fixture);
  assert.deepEqual(
    report.keyboardInputScript.ticks.map((tickEntry) => `${tickEntry.tick}:${tickEntry.keys.join('+')}`),
    ['1:ArrowRight', '2:ArrowRight+ArrowUp']
  );
});

test('keyboard input script v1: invalid duplicate tick fixture fails predictably', async () => {
  const invalidFixturePath = inputScriptFixturePath('invalid.duplicate-tick.keyboard-input-script.json');
  const fixture = JSON.parse(await readFile(invalidFixturePath, 'utf8'));

  assertKeyboardInputScriptV1Rejects(fixture);

  const report = await validateKeyboardInputScriptV1File(invalidFixturePath);
  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      path: '$.ticks[1].tick',
      message: 'must be unique; duplicate of $.ticks[0].tick'
    }
  ]);
});

test('keyboard input script v1: in-memory validator rejects blank entityId once', async () => {
  const report = await validateKeyboardInputScriptV1({
    keyboardInputScriptVersion: 1,
    entityId: '   ',
    ticks: [
      {
        tick: 1,
        keys: ['ArrowRight']
      }
    ]
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.errors, [
    {
      path: '$.entityId',
      message: 'must not be blank'
    }
  ]);
});
