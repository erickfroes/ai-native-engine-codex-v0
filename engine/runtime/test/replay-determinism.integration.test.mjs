import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, runDeterministicReplay } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('runDeterministicReplay returns same final snapshot with same scene, seed and ticks', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));

  const firstRun = runDeterministicReplay(scene, { ticks: 3, seed: 42 });
  const secondRun = runDeterministicReplay(scene, { ticks: 3, seed: 42 });
  const differentTicksRun = runDeterministicReplay(scene, { ticks: 4, seed: 42 });

  assert.deepEqual(firstRun, secondRun);
  assert.equal(firstRun.snapshot.opcode, 'world.snapshot');
  assert.equal(firstRun.snapshot.payload.tick, 3);
  assert.equal(firstRun.replaySignature, secondRun.replaySignature);
  assert.notEqual(firstRun.replaySignature, differentTicksRun.replaySignature);
  assert.deepEqual(firstRun.systemExecutionOrder, [
    'core.loop',
    'input.keyboard',
    'networking.replication',
    'core.loop',
    'input.keyboard',
    'networking.replication',
    'core.loop',
    'input.keyboard',
    'networking.replication'
  ]);
});
