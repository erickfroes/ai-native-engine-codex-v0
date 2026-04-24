import assert from 'node:assert/strict';

import { getSystemRegistryV1 } from '../../src/index.mjs';
import { assertSceneValidationReportV1 } from './assertSceneValidationReportV1.mjs';

const ROOT_KEYS = Object.freeze([
  'estimated',
  'executionPlanVersion',
  'scene',
  'seed',
  'systemsPerTick',
  'ticks',
  'valid',
  'validation'
]);

const TICK_KEYS = Object.freeze(['systems', 'tick']);
const SYSTEM_KEYS = Object.freeze(['delta', 'deterministic', 'known', 'name', 'order']);
const ESTIMATED_KEYS = Object.freeze(['finalState', 'initialState', 'totalDelta']);

const registryByName = new Map(getSystemRegistryV1().systems.map((system) => [system.name, system]));

export function assertExecutionPlanV1(plan) {
  assert.equal(typeof plan, 'object');
  assert.notEqual(plan, null);
  assert.deepEqual(Object.keys(plan).sort(), ROOT_KEYS);
  assert.equal(plan.executionPlanVersion, 1);
  assert.equal(typeof plan.scene, 'string');
  assert.equal(Number.isInteger(plan.ticks), true);
  assert.equal(Number.isInteger(plan.seed), true);
  assert.equal(typeof plan.valid, 'boolean');
  assert.equal(Array.isArray(plan.systemsPerTick), true);

  assertSceneValidationReportV1(plan.validation);
  assert.equal(plan.validation.valid, plan.valid);

  assert.equal(typeof plan.estimated, 'object');
  assert.notEqual(plan.estimated, null);
  assert.deepEqual(Object.keys(plan.estimated).sort(), ESTIMATED_KEYS);
  assert.equal(Number.isInteger(plan.estimated.initialState), true);
  assert.equal(Number.isInteger(plan.estimated.totalDelta), true);
  assert.equal(Number.isInteger(plan.estimated.finalState), true);

  for (const tickPlan of plan.systemsPerTick) {
    assert.equal(typeof tickPlan, 'object');
    assert.notEqual(tickPlan, null);
    assert.deepEqual(Object.keys(tickPlan).sort(), TICK_KEYS);
    assert.equal(Number.isInteger(tickPlan.tick), true);
    assert.equal(Array.isArray(tickPlan.systems), true);

    for (const [index, system] of tickPlan.systems.entries()) {
      const keys = Object.keys(system).sort();
      assert.deepEqual(keys, SYSTEM_KEYS.filter((key) => keys.includes(key)));
      assert.equal(typeof system.name, 'string');
      assert.equal(typeof system.known, 'boolean');
      assert.equal(Number.isInteger(system.order), true);
      assert.equal(system.order, index);

      const registrySystem = registryByName.get(system.name);
      if (system.known) {
        assert.notEqual(registrySystem, undefined);
        assert.equal(system.delta, registrySystem.delta);
        assert.equal(system.deterministic, registrySystem.deterministic);
      } else {
        assert.equal(system.delta, undefined);
        assert.equal(system.deterministic, undefined);
      }
    }
  }
}

