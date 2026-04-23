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

test('run-replay-artifact returns deterministic compact JSON with exact shape', () => {
  const first = runCli(['run-replay-artifact', scenePath, '--ticks', '3', '--seed', '42', '--json']);
  const second = runCli(['run-replay-artifact', scenePath, '--ticks', '3', '--seed', '42', '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstArtifact = JSON.parse(first.stdout);
  const secondArtifact = JSON.parse(second.stdout);
  const expectedKeys = [
    'executedSystemCount',
    'finalState',
    'replayArtifactVersion',
    'replaySignature',
    'scene',
    'seed',
    'snapshotOpcode',
    'ticks'
  ];

  assert.deepEqual(Object.keys(firstArtifact).sort(), expectedKeys);
  assert.equal(firstArtifact.replayArtifactVersion, 1);
  assert.equal(firstArtifact.snapshotOpcode, 'world.snapshot');
  assert.deepEqual(firstArtifact, secondArtifact);
});
