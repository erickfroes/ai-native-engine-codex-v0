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


test('loopable fixture evolves final state per tick in deterministic way', async () => {
  const scene = await loadSceneFile(scenePath('loopable-minimal.scene.json'));

  const tick1 = runMinimalSystemLoop(scene, { ticks: 1, seed: 21 });
  const tick3 = runMinimalSystemLoop(scene, { ticks: 3, seed: 21 });
  const tick3Again = runMinimalSystemLoop(scene, { ticks: 3, seed: 21 });

  assert.equal(tick1.ticksExecuted, 1);
  assert.equal(tick3.ticksExecuted, 3);
  assert.notEqual(tick1.finalState, tick3.finalState);
  assert.deepEqual(tick3, tick3Again);
  assert.deepEqual(tick3.executedSystems, [
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


test('loopable fixture with ticks=0 executes nothing and preserves normalized initial state', async () => {
  const scene = await loadSceneFile(scenePath('loopable-minimal.scene.json'));

  const result = runMinimalSystemLoop(scene, { ticks: 0, seed: 21 });

  assert.deepEqual(Object.keys(result).sort(), ['executedSystems', 'finalState', 'ticksExecuted']);
  assert.equal(result.ticksExecuted, 0);
  assert.deepEqual(result.executedSystems, []);
  assert.equal(result.finalState, 21);
});

test('core.loop applies explicit minimal state increment semantics', () => {
  const coreLoopOnlyScene = {
    entities: [],
    systems: ['core.loop']
  };

  const seed = 21;
  const ticks0 = runMinimalSystemLoop(coreLoopOnlyScene, { ticks: 0, seed });
  const ticks1 = runMinimalSystemLoop(coreLoopOnlyScene, { ticks: 1, seed });
  const ticks5 = runMinimalSystemLoop(coreLoopOnlyScene, { ticks: 5, seed });
  const ticks5Again = runMinimalSystemLoop(coreLoopOnlyScene, { ticks: 5, seed });

  assert.equal(ticks0.finalState, seed);
  assert.equal(ticks1.finalState, (seed + 1) >>> 0);
  assert.equal(ticks5.finalState, (seed + 5) >>> 0);
  assert.equal(ticks5.finalState, ticks5Again.finalState);
});


test('networking.replication applies explicit minimal state increment semantics', () => {
  const replicationOnlyScene = {
    entities: [],
    systems: ['networking.replication']
  };

  const seed = 21;
  const ticksNValue = 7;
  const ticks0 = runMinimalSystemLoop(replicationOnlyScene, { ticks: 0, seed });
  const ticks1 = runMinimalSystemLoop(replicationOnlyScene, { ticks: 1, seed });
  const ticksN = runMinimalSystemLoop(replicationOnlyScene, { ticks: ticksNValue, seed });
  const ticksNAgain = runMinimalSystemLoop(replicationOnlyScene, { ticks: ticksNValue, seed });

  assert.equal(ticks0.finalState, seed);
  assert.equal(ticks1.finalState, (seed + 2) >>> 0);
  assert.equal(ticksN.finalState, (seed + 2 * ticksNValue) >>> 0);
  assert.deepEqual(ticksN, ticksNAgain);
});

test('input.keyboard applies explicit minimal state increment semantics', () => {
  const inputKeyboardOnlyScene = {
    entities: [],
    systems: ['input.keyboard']
  };

  const seed = 21;
  const ticksNValue = 7;
  const ticks0 = runMinimalSystemLoop(inputKeyboardOnlyScene, { ticks: 0, seed });
  const ticks1 = runMinimalSystemLoop(inputKeyboardOnlyScene, { ticks: 1, seed });
  const ticksN = runMinimalSystemLoop(inputKeyboardOnlyScene, { ticks: ticksNValue, seed });
  const ticksNAgain = runMinimalSystemLoop(inputKeyboardOnlyScene, { ticks: ticksNValue, seed });

  assert.equal(ticks0.finalState, seed);
  assert.equal(ticks1.finalState, (seed + 3) >>> 0);
  assert.equal(ticksN.finalState, (seed + 3 * ticksNValue) >>> 0);
  assert.deepEqual(ticksN, ticksNAgain);
});
