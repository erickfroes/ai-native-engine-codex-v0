import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const scenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const inputIntentPath = path.join(repoRoot, 'fixtures', 'input', 'valid.move.intent.json');
const movementBlockingLoopBlockedScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-loop-blocked.scene.json'
);
const movementBlockingLoopOpenScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-loop-open.scene.json'
);
const movementBlockingLoopInputIntentPath = path.join(repoRoot, 'fixtures', 'input', 'move-player-right.intent.json');

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

test('run-loop --movement-blocking blocks input delta when collision is blocked', () => {
  const baseline = runCli([
    'run-loop',
    movementBlockingLoopBlockedScenePath,
    '--ticks',
    '1',
    '--seed',
    '40',
    '--input-intent',
    movementBlockingLoopInputIntentPath,
    '--json'
  ]);
  const blocked = runCli([
    'run-loop',
    movementBlockingLoopBlockedScenePath,
    '--ticks',
    '1',
    '--seed',
    '40',
    '--movement-blocking',
    '--input-intent',
    movementBlockingLoopInputIntentPath,
    '--json'
  ]);

  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(blocked.status, 0, blocked.stderr);

  const baselineReport = JSON.parse(baseline.stdout);
  const blockedReport = JSON.parse(blocked.stdout);
  assert.equal(blockedReport.finalState, baselineReport.finalState - 1);
});

test('run-loop --movement-blocking keeps open movement and non-movement paths unchanged', () => {
  const blocked = runCli([
    'run-loop',
    movementBlockingLoopOpenScenePath,
    '--ticks',
    '1',
    '--seed',
    '40',
    '--movement-blocking',
    '--input-intent',
    movementBlockingLoopInputIntentPath,
    '--json'
  ]);
  const open = runCli([
    'run-loop',
    movementBlockingLoopOpenScenePath,
    '--ticks',
    '1',
    '--seed',
    '40',
    '--input-intent',
    movementBlockingLoopInputIntentPath,
    '--json'
  ]);

  assert.equal(blocked.status, 0, blocked.stderr);
  assert.equal(open.status, 0, open.stderr);
  assert.deepEqual(JSON.parse(blocked.stdout), JSON.parse(open.stdout));
});

test('run-loop --movement-blocking works predictably when no input intent is provided', () => {
  const baseline = runCli(['run-loop', movementBlockingLoopBlockedScenePath, '--ticks', '1', '--seed', '40', '--json']);
  const withFlag = runCli([
    'run-loop',
    movementBlockingLoopBlockedScenePath,
    '--ticks',
    '1',
    '--seed',
    '40',
    '--movement-blocking',
    '--json'
  ]);

  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(withFlag.status, 0, withFlag.stderr);
  assert.deepEqual(JSON.parse(baseline.stdout), JSON.parse(withFlag.stdout));
});

test('run-loop --movement-blocking validates input intent input path', () => {
  const missingInput = runCli([
    'run-loop',
    movementBlockingLoopOpenScenePath,
    '--ticks',
    '1',
    '--input-intent',
    path.join(repoRoot, 'fixtures', 'input', 'does-not-exist.intent.json'),
    '--movement-blocking',
    '--json'
  ]);

  assert.notEqual(missingInput.status, 0);
  assert.match(missingInput.stderr, /ENOENT: no such file or directory/);
});

test('run-loop --input-intent keeps report shape and changes finalState predictably', () => {
  const first = runCli(['run-loop', scenePath, '--ticks', '4', '--seed', '10', '--input-intent', inputIntentPath, '--json']);
  const second = runCli(['run-loop', scenePath, '--ticks', '4', '--seed', '10', '--input-intent', inputIntentPath, '--json']);

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
  assert.equal(firstReport.finalState, 31);
  assert.deepEqual(firstReport, secondReport);
});

test('run-loop fails when --ticks is missing', () => {
  const result = runCli(['run-loop', scenePath, '--seed', '10', '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /run-loop: --ticks is required/);
});
