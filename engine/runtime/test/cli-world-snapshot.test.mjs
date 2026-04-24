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

test('emit-world-snapshot prints deterministic JSON containing world.snapshot opcode', () => {
  const first = runCli(['emit-world-snapshot', scenePath, '--json']);
  const second = runCli(['emit-world-snapshot', scenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstMessage = JSON.parse(first.stdout);
  const secondMessage = JSON.parse(second.stdout);

  assert.equal(firstMessage.opcode, 'world.snapshot');
  assert.equal(firstMessage.opcode, secondMessage.opcode);
  assert.deepEqual(firstMessage, secondMessage);
});
