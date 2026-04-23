import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const scenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

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
