import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['registryVersion', 'systems']);
const SYSTEM_KEYS = Object.freeze(['delta', 'deterministic', 'name']);

const EXPECTED_SYSTEMS = Object.freeze([
  Object.freeze({ name: 'core.loop', delta: 1, deterministic: true }),
  Object.freeze({ name: 'input.keyboard', delta: 3, deterministic: true }),
  Object.freeze({ name: 'networking.replication', delta: 2, deterministic: true })
]);

export function assertSystemRegistryV1(registry) {
  assert.equal(typeof registry, 'object');
  assert.notEqual(registry, null);
  assert.deepEqual(Object.keys(registry).sort(), ROOT_KEYS);
  assert.equal(registry.registryVersion, 1);
  assert.equal(Array.isArray(registry.systems), true);
  assert.equal(registry.systems.length, EXPECTED_SYSTEMS.length);

  const names = registry.systems.map((system) => system.name);
  assert.equal(new Set(names).size, names.length);

  for (const system of registry.systems) {
    assert.equal(typeof system, 'object');
    assert.notEqual(system, null);
    assert.deepEqual(Object.keys(system).sort(), SYSTEM_KEYS);
    assert.equal(typeof system.name, 'string');
    assert.equal(Number.isInteger(system.delta), true);
    assert.equal(typeof system.deterministic, 'boolean');
  }

  assert.deepEqual(registry.systems, EXPECTED_SYSTEMS);
}

