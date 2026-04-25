import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const validIntentPath = path.join(repoRoot, 'fixtures', 'input', 'valid.move.intent.json');
const invalidIntentPath = path.join(repoRoot, 'fixtures', 'input', 'invalid.missing-entity.intent.json');
const validIntentFixture = JSON.parse(readFileSync(validIntentPath, 'utf8'));

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('validate-input-intent valid fixture passes', () => {
  const result = runCli(['validate-input-intent', validIntentPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /Entity: player/);
  assert.match(result.stdout, /Actions: move\(1,0\), move\(0,-1\)/);
});

test('validate-input-intent invalid fixture fails predictably', () => {
  const result = runCli(['validate-input-intent', invalidIntentPath, '--json']);

  assert.equal(result.status, 1, result.stderr);

  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.entityId' && error.message === 'is required'));
});

test('validate-input-intent --json returns stable report shape for valid fixture', () => {
  const first = runCli(['validate-input-intent', validIntentPath, '--json']);
  const second = runCli(['validate-input-intent', validIntentPath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  const expectedReport = {
    ok: true,
    absolutePath: validIntentPath,
    inputIntent: validIntentFixture,
    errors: []
  };

  assert.deepEqual(firstReport, expectedReport);
  assert.deepEqual(secondReport, expectedReport);
});

test('validate-input-intent prints readable status in default mode', () => {
  const result = runCli(['validate-input-intent', invalidIntentPath]);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /Entity: \(missing\)/);
  assert.match(result.stdout, /\$\.entityId: is required/);
});

test('keyboard-to-input-intent prints valid input intent JSON for a movement chord', () => {
  const result = runCli([
    'keyboard-to-input-intent',
    '--tick',
    '1',
    '--entity',
    'player',
    '--keys',
    'ArrowRight,ArrowUp'
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    inputIntentVersion: 1,
    tick: 1,
    entityId: 'player',
    actions: [
      {
        type: 'move',
        axis: {
          x: 1,
          y: -1
        }
      }
    ]
  });
});

test('keyboard-to-input-intent fails predictably when --tick is invalid', () => {
  const result = runCli([
    'keyboard-to-input-intent',
    '--tick',
    'abc',
    '--entity',
    'player',
    '--keys',
    'ArrowRight'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /keyboard-to-input-intent: --tick must be an integer/);
});

test('keyboard-to-input-intent fails predictably when --entity is blank', () => {
  const result = runCli([
    'keyboard-to-input-intent',
    '--tick',
    '1',
    '--entity',
    '   ',
    '--keys',
    'ArrowRight'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /keyboard-to-input-intent: --entity must be a non-empty string/);
});

test('keyboard-to-input-intent fails predictably when --keys is empty', () => {
  const result = runCli([
    'keyboard-to-input-intent',
    '--tick',
    '1',
    '--entity',
    'player',
    '--keys',
    ','
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /keyboard-to-input-intent: --keys must contain at least one key/);
});
