import assert from 'node:assert/strict';

export function assertStateProcessorRegistryV1(registry) {
  assert.equal(typeof registry, 'object');
  assert.notEqual(registry, null);
  assert.equal(registry.stateProcessorRegistryVersion, 1);
  assert.equal(Array.isArray(registry.processors), true);

  const names = registry.processors.map((processor) => processor.name);
  assert.deepEqual(names, ['movement.integrate']);

  const uniqueNames = new Set(names);
  assert.equal(uniqueNames.size, names.length);

  const movement = registry.processors[0];
  assert.equal(movement.version, 1);
  assert.equal(movement.deterministic, true);
  assert.deepEqual(movement.requiredComponents, ['transform', 'velocity']);
}
