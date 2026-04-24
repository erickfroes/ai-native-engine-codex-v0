import assert from 'node:assert/strict';

import {
  getSystemRegistryV1,
  getSystemPhaseRegistryV1,
  getSystemPhase
} from '../../src/index.mjs';

const ROOT_KEYS = Object.freeze(['phaseRegistryVersion', 'phases', 'systemPhases']);
const PHASE_KEYS = Object.freeze(['description', 'name', 'order']);
const SYSTEM_PHASE_KEYS = Object.freeze(['phase', 'system']);

const EXPECTED_PHASES = Object.freeze(['core', 'input', 'networking']);
const EXPECTED_SYSTEM_TO_PHASE = Object.freeze({
  'core.loop': 'core',
  'input.keyboard': 'input',
  'networking.replication': 'networking'
});

export function assertSystemPhaseRegistryV1(registry = getSystemPhaseRegistryV1()) {
  assert.equal(typeof registry, 'object');
  assert.notEqual(registry, null);
  assert.deepEqual(Object.keys(registry).sort(), ROOT_KEYS);
  assert.equal(registry.phaseRegistryVersion, 1);
  assert.equal(Array.isArray(registry.phases), true);
  assert.equal(Array.isArray(registry.systemPhases), true);

  const phaseNames = registry.phases.map((phase) => phase.name);
  assert.deepEqual([...phaseNames].sort(), [...EXPECTED_PHASES].sort());
  assert.equal(new Set(phaseNames).size, phaseNames.length);

  for (const phase of registry.phases) {
    assert.equal(typeof phase, 'object');
    assert.notEqual(phase, null);
    const keys = Object.keys(phase).sort();
    assert.deepEqual(keys, PHASE_KEYS.filter((key) => keys.includes(key)));
    assert.equal(typeof phase.name, 'string');
    assert.equal(Number.isInteger(phase.order), true);
    if (phase.description !== undefined) {
      assert.equal(typeof phase.description, 'string');
    }
  }

  const systemPhasePairs = registry.systemPhases.map((pair) => `${pair.system}:${pair.phase}`);
  assert.equal(new Set(systemPhasePairs).size, systemPhasePairs.length);

  const knownSystems = getSystemRegistryV1().systems.map((system) => system.name);
  const systemPhaseMap = new Map();
  for (const pair of registry.systemPhases) {
    assert.equal(typeof pair, 'object');
    assert.notEqual(pair, null);
    assert.deepEqual(Object.keys(pair).sort(), SYSTEM_PHASE_KEYS);
    assert.equal(typeof pair.system, 'string');
    assert.equal(typeof pair.phase, 'string');
    assert.ok(knownSystems.includes(pair.system));
    assert.ok(phaseNames.includes(pair.phase));
    systemPhaseMap.set(pair.system, pair.phase);
  }

  assert.equal(systemPhaseMap.size, knownSystems.length);
  for (const systemName of knownSystems) {
    assert.ok(systemPhaseMap.has(systemName));
  }

  assert.deepEqual(Object.fromEntries(systemPhaseMap), EXPECTED_SYSTEM_TO_PHASE);
  assert.equal(getSystemPhase('core.loop'), 'core');
  assert.equal(getSystemPhase('input.keyboard'), 'input');
  assert.equal(getSystemPhase('networking.replication'), 'networking');
}

