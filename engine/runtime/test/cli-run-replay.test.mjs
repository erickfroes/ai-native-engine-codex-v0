import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const scenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const validKeyboardScriptPath = path.join(repoRoot, 'fixtures', 'input-script', 'valid.keyboard-input-script.json');
const invalidKeyboardScriptPath = path.join(repoRoot, 'fixtures', 'input-script', 'invalid.duplicate-tick.keyboard-input-script.json');
const missingKeyboardScriptPath = path.join(repoRoot, 'fixtures', 'input-script', 'missing.keyboard-input-script.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('run-replay returns deterministic CI JSON including replaySignature and world.snapshot opcode', () => {
  const first = runCli(['run-replay', scenePath, '--ticks', '3', '--seed', '42', '--json']);
  const second = runCli(['run-replay', scenePath, '--ticks', '3', '--seed', '42', '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  const expectedKeys = [
    'ciPayloadVersion',
    'replaySignature',
    'scene',
    'seed',
    'snapshotOpcode',
    'ticks'
  ];

  assert.deepEqual(Object.keys(firstReport).sort(), expectedKeys);
  assert.equal(firstReport.ciPayloadVersion, 1);
  assert.equal(firstReport.snapshotOpcode, 'world.snapshot');
  assert.equal(typeof firstReport.replaySignature, 'string');
  assert.ok(firstReport.replaySignature.length > 0);
  assert.deepEqual(firstReport, secondReport);
});

test('run-replay fails when --ticks is missing', () => {
  const result = runCli(['run-replay', scenePath, '--seed', '42', '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /run-replay: --ticks is required/);
});

test('run-replay fails when --ticks is not an integer', () => {
  const result = runCli(['run-replay', scenePath, '--ticks', 'abc', '--seed', '42', '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /run-replay: --ticks must be an integer/);
});

test('run-replay fails when --seed is not an integer', () => {
  const result = runCli(['run-replay', scenePath, '--ticks', '3', '--seed', 'not-a-number', '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /run-replay: --seed must be an integer/);
});

test('run-loop returns deterministic JSON with exact shape and expected +6 composition', () => {
  const first = runCli(['run-loop', scenePath, '--ticks', '4', '--seed', '10', '--json']);
  const second = runCli(['run-loop', scenePath, '--ticks', '4', '--seed', '10', '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  const expectedKeys = [
    'executedSystems',
    'finalState',
    'loopReportVersion',
    'scene',
    'seed',
    'ticks',
    'ticksExecuted'
  ];

  assert.deepEqual(Object.keys(firstReport).sort(), expectedKeys);
  assert.equal(firstReport.loopReportVersion, 1);
  assert.equal(firstReport.seed, 10);
  assert.equal(firstReport.ticks, 4);
  assert.equal(firstReport.ticksExecuted, 4);
  assert.equal(firstReport.finalState, 34);
  assert.deepEqual(firstReport, secondReport);
});

test('run-loop --json without --seed uses default seed deterministically', () => {
  const first = runCli(['run-loop', scenePath, '--ticks', '4', '--json']);
  const second = runCli(['run-loop', scenePath, '--ticks', '4', '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  const expectedKeys = [
    'executedSystems',
    'finalState',
    'loopReportVersion',
    'scene',
    'seed',
    'ticks',
    'ticksExecuted'
  ];

  assert.deepEqual(Object.keys(firstReport).sort(), expectedKeys);
  assert.equal(firstReport.loopReportVersion, 1);
  assert.equal(firstReport.seed, 1337);
  assert.equal(firstReport.ticksExecuted, 4);
  assert.equal(firstReport.finalState, 1361);
  assert.deepEqual(firstReport, secondReport);
});

test('run-loop --keyboard-script returns deterministic JSON and expected scripted finalState', () => {
  const first = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '2',
    '--seed',
    '10',
    '--keyboard-script',
    validKeyboardScriptPath,
    '--json'
  ]);
  const second = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '2',
    '--seed',
    '10',
    '--keyboard-script',
    validKeyboardScriptPath,
    '--json'
  ]);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  const expectedKeys = [
    'executedSystems',
    'finalState',
    'loopReportVersion',
    'scene',
    'seed',
    'ticks',
    'ticksExecuted'
  ];

  assert.deepEqual(Object.keys(firstReport).sort(), expectedKeys);
  assert.equal(firstReport.loopReportVersion, 1);
  assert.equal(firstReport.scene, 'tutorial');
  assert.equal(firstReport.seed, 10);
  assert.equal(firstReport.ticks, 2);
  assert.equal(firstReport.finalState, 17);
  assert.equal(firstReport.ticksExecuted, 2);
  assert.deepEqual(firstReport, secondReport);
});

test('run-loop --keyboard-script fails predictably for invalid script', () => {
  const result = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '2',
    '--seed',
    '10',
    '--keyboard-script',
    invalidKeyboardScriptPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /keyboard input script is invalid/);
  assert.match(result.stderr, /\$\.ticks\[1\]\.tick: must be unique/);
});

test('run-loop --keyboard-script fails predictably for a missing script path', () => {
  const result = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '2',
    '--seed',
    '10',
    '--keyboard-script',
    missingKeyboardScriptPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /missing\.keyboard-input-script\.json/);
});

test('run-loop fails when --ticks is missing', () => {
  const result = runCli(['run-loop', scenePath, '--seed', '10', '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /run-loop: --ticks is required/);
});
