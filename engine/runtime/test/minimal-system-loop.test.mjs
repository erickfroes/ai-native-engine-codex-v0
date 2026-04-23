import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, runMinimalSystemLoop } from '../src/index.mjs';
import { runDeterministicReplay } from '../src/replay/run-deterministic-replay.mjs';
import { resolveSystemHandler } from '../src/loop/system-handlers.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('runMinimalSystemLoop is deterministic with same scene, seed and ticks', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));

  const first = runMinimalSystemLoop(scene, { ticks: 3, seed: 42 });
  const second = runMinimalSystemLoop(scene, { ticks: 3, seed: 42 });

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first).sort(), ['executedSystems', 'finalState', 'ticksExecuted']);
  assert.equal(first.ticksExecuted, 3);
  assert.equal(typeof first.finalState, 'number');
});

test('runMinimalSystemLoop executes systems in declared stable order per tick', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));
  const result = runMinimalSystemLoop(scene, { ticks: 2, seed: 7 });

  assert.deepEqual(result.executedSystems, [
    'core.loop',
    'input.keyboard',
    'networking.replication',
    'core.loop',
    'input.keyboard',
    'networking.replication'
  ]);
});

test('known systems resolve to deterministic stub handlers', () => {
  assert.notEqual(resolveSystemHandler('core.loop'), resolveSystemHandler('unknown.system'));
  assert.notEqual(resolveSystemHandler('input.keyboard'), resolveSystemHandler('unknown.system'));
  assert.notEqual(resolveSystemHandler('networking.replication'), resolveSystemHandler('unknown.system'));
});

test('unknown systems use predictable fallback behavior', () => {
  const scene = {
    entities: [],
    systems: ['unknown.alpha', 'unknown.alpha']
  };

  const first = runDeterministicReplay(scene, { ticks: 2, seed: 11 });
  const second = runDeterministicReplay(scene, { ticks: 2, seed: 11 });

  assert.equal(first.executedSystemCount, 4);
  assert.deepEqual(first.systemExecutionOrder, ['unknown.alpha', 'unknown.alpha', 'unknown.alpha', 'unknown.alpha']);
  assert.equal(first.finalState, second.finalState);
});
