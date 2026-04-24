import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSystemRegistryV1,
  getKnownSystemDefinition,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace
} from '../src/index.mjs';
import { runDeterministicReplay } from '../src/replay/run-deterministic-replay.mjs';
import { assertSystemRegistryV1 } from './helpers/assertSystemRegistryV1.mjs';

test('system registry v1 contains exactly the expected known deterministic systems', () => {
  const registry = getSystemRegistryV1();
  assertSystemRegistryV1(registry);
});

test('known system definitions resolve from registry', () => {
  assert.deepEqual(getKnownSystemDefinition('core.loop'), {
    name: 'core.loop',
    delta: 1,
    deterministic: true
  });
  assert.deepEqual(getKnownSystemDefinition('input.keyboard'), {
    name: 'input.keyboard',
    delta: 3,
    deterministic: true
  });
  assert.deepEqual(getKnownSystemDefinition('networking.replication'), {
    name: 'networking.replication',
    delta: 2,
    deterministic: true
  });
  assert.equal(getKnownSystemDefinition('unknown.system'), undefined);
});

test('runtime loop execution uses registry deltas for known systems', () => {
  const scene = {
    entities: [],
    systems: ['core.loop', 'input.keyboard', 'networking.replication']
  };

  const result = runMinimalSystemLoop(scene, { ticks: 4, seed: 10 });
  assert.equal(result.finalState, 34);
  assert.equal(result.ticksExecuted, 4);
});

test('loop trace reports per-system deltas from registry for known systems', () => {
  const scene = {
    metadata: { name: 'registry-delta-scene' },
    entities: [],
    systems: ['core.loop', 'input.keyboard', 'networking.replication']
  };

  const traced = runMinimalSystemLoopWithTrace(scene, { ticks: 1, seed: 10 });
  const deltas = traced.trace.systemsPerTick[0].systems.map((system) => system.delta);
  assert.deepEqual(deltas, [1, 3, 2]);
  assert.equal(traced.report.finalState, 16);
});

test('unknown systems keep deterministic fallback behavior', () => {
  const scene = {
    entities: [],
    systems: ['unknown.alpha', 'unknown.alpha']
  };

  const first = runDeterministicReplay(scene, { ticks: 2, seed: 11 });
  const second = runDeterministicReplay(scene, { ticks: 2, seed: 11 });

  assert.equal(first.finalState, second.finalState);
  assert.deepEqual(first.systemExecutionOrder, ['unknown.alpha', 'unknown.alpha', 'unknown.alpha', 'unknown.alpha']);
});

