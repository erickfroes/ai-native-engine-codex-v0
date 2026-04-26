import assert from 'node:assert/strict';

export function assertComponentRegistryV1(registry) {
  assert.equal(typeof registry, 'object');
  assert.notEqual(registry, null);
  assert.equal(registry.componentRegistryVersion, 1);
  assert.equal(Array.isArray(registry.components), true);

  const names = registry.components.map((component) => component.name);
  assert.deepEqual(names, ['transform', 'velocity', 'visual.sprite']);

  const uniqueNames = new Set(names);
  assert.equal(uniqueNames.size, names.length);

  for (const component of registry.components) {
    assert.equal(component.version, 1);
    assert.equal(component.deterministic, true);
    assert.equal(typeof component.description, 'string');
    assert.equal(component.description.length > 0, true);
  }
}
