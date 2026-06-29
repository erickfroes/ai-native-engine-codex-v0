import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const validInputPath = path.join(repoRoot, 'fixtures', 'ui-input', 'navigate-next.ui-explicit-input.json');
const invalidInputPath = path.join(repoRoot, 'fixtures', 'ui-input', 'invalid.version.ui-explicit-input.json');
const validInputFixture = JSON.parse(readFileSync(validInputPath, 'utf8'));

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('validate-ui-explicit-input valid fixture passes', () => {
  const result = runCli(['validate-ui-explicit-input', validInputPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /Action: navigate\(next\)/);
});

test('validate-ui-explicit-input invalid fixture fails predictably', () => {
  const result = runCli(['validate-ui-explicit-input', invalidInputPath, '--json']);

  assert.equal(result.status, 1, result.stderr);

  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.ok(
    report.errors.some((error) => error.path === '$.uiExplicitInputVersion' && error.message === 'must be 1')
  );
});

test('validate-ui-explicit-input --json returns stable report shape for valid fixture', () => {
  const first = runCli(['validate-ui-explicit-input', validInputPath, '--json']);
  const second = runCli(['validate-ui-explicit-input', validInputPath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const expectedReport = {
    ok: true,
    absolutePath: validInputPath,
    uiExplicitInput: validInputFixture,
    errors: []
  };

  assert.deepEqual(JSON.parse(first.stdout), expectedReport);
  assert.deepEqual(JSON.parse(second.stdout), expectedReport);
});

test('keyboard-to-ui-explicit-input prints valid UI explicit input JSON', () => {
  const nextResult = runCli([
    'keyboard-to-ui-explicit-input',
    '--tick',
    '1',
    '--keys',
    'ArrowRight'
  ]);
  const activateResult = runCli([
    'keyboard-to-ui-explicit-input',
    '--tick',
    '2',
    '--keys',
    'Enter'
  ]);

  assert.equal(nextResult.status, 0, nextResult.stderr);
  assert.deepEqual(JSON.parse(nextResult.stdout), {
    uiExplicitInputVersion: 1,
    tick: 1,
    action: {
      type: 'navigate',
      direction: 'next'
    }
  });

  assert.equal(activateResult.status, 0, activateResult.stderr);
  assert.deepEqual(JSON.parse(activateResult.stdout), {
    uiExplicitInputVersion: 1,
    tick: 2,
    action: {
      type: 'activate'
    }
  });
});

test('keyboard-to-ui-explicit-input fails predictably for invalid or ambiguous keys', () => {
  const invalidTick = runCli([
    'keyboard-to-ui-explicit-input',
    '--tick',
    'abc',
    '--keys',
    'ArrowRight'
  ]);
  const ambiguousKeys = runCli([
    'keyboard-to-ui-explicit-input',
    '--tick',
    '1',
    '--keys',
    'Enter,ArrowRight'
  ]);

  assert.notEqual(invalidTick.status, 0);
  assert.match(invalidTick.stderr, /keyboard-to-ui-explicit-input: --tick must be an integer/);
  assert.notEqual(ambiguousKeys.status, 0);
  assert.match(ambiguousKeys.stderr, /must not mix activate and navigate inputs/);
});
