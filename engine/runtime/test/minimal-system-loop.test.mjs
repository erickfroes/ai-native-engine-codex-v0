import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, runMinimalSystemLoop, runMinimalSystemLoopWithTrace } from '../src/index.mjs';
import { runDeterministicReplay } from '../src/replay/run-deterministic-replay.mjs';
import { resolveSystemHandler } from '../src/loop/system-handlers.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

function createValidInputIntent(overrides = {}) {
  return {
    inputIntentVersion: 1,
    tick: 99,
    entityId: 'player',
    actions: [
      {
        type: 'move',
        axis: {
          x: 1,
          y: 0
        }
      }
    ],
    ...overrides
  };
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

test('runMinimalSystemLoop accepts opt-in input intent without changing unmatched ticks', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));

  const baseline = runMinimalSystemLoop(scene, { ticks: 2, seed: 7 });
  const withInputIntent = runMinimalSystemLoop(scene, {
    ticks: 2,
    seed: 7,
    inputIntent: createValidInputIntent()
  });

  assert.deepEqual(withInputIntent, baseline);
});

test('runMinimalSystemLoopWithTrace accepts opt-in input intent without changing unmatched ticks', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));

  const baseline = runMinimalSystemLoopWithTrace(scene, { ticks: 2, seed: 7 });
  const withInputIntent = runMinimalSystemLoopWithTrace(scene, {
    ticks: 2,
    seed: 7,
    inputIntent: createValidInputIntent()
  });

  assert.deepEqual(withInputIntent, baseline);
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

test('input.keyboard applies opt-in move axis contribution on matching tick', () => {
  const inputKeyboardOnlyScene = {
    entities: [],
    systems: ['input.keyboard']
  };

  const seed = 21;
  const inputIntent = createValidInputIntent({
    tick: 1,
    actions: [
      {
        type: 'move',
        axis: {
          x: 1,
          y: 0
        }
      },
      {
        type: 'move',
        axis: {
          x: 0,
          y: -1
        }
      }
    ]
  });

  const result = runMinimalSystemLoop(inputKeyboardOnlyScene, {
    ticks: 1,
    seed,
    inputIntent
  });
  const traced = runMinimalSystemLoopWithTrace(inputKeyboardOnlyScene, {
    ticks: 1,
    seed,
    inputIntent
  });

  assert.equal(result.finalState, seed);
  assert.equal(traced.report.finalState, seed);
  assert.equal(traced.trace.systemsPerTick[0].systems[0].delta, 0);
});

test('headless composition of known systems applies +6 per tick and preserves declared order', () => {
  const composedScene = {
    entities: [],
    systems: ['core.loop', 'input.keyboard', 'networking.replication']
  };

  const seed = 21;
  const ticksNValue = 7;
  const ticks0 = runMinimalSystemLoop(composedScene, { ticks: 0, seed });
  const ticks1 = runMinimalSystemLoop(composedScene, { ticks: 1, seed });
  const ticksN = runMinimalSystemLoop(composedScene, { ticks: ticksNValue, seed });
  const ticksNAgain = runMinimalSystemLoop(composedScene, { ticks: ticksNValue, seed });

  assert.equal(ticks0.finalState, seed);
  assert.equal(ticks1.finalState, (seed + 6) >>> 0);
  assert.equal(ticksN.finalState, (seed + 6 * ticksNValue) >>> 0);
  assert.deepEqual(ticksN, ticksNAgain);
  assert.deepEqual(ticks1.executedSystems, ['core.loop', 'input.keyboard', 'networking.replication']);
  assert.deepEqual(
    ticksN.executedSystems,
    Array.from({ length: ticksNValue }, () => ['core.loop', 'input.keyboard', 'networking.replication']).flat()
  );
});
