const SYSTEM_REGISTRY_V1 = Object.freeze({
  registryVersion: 1,
  systems: Object.freeze([
    Object.freeze({
      name: 'core.loop',
      delta: 1,
      deterministic: true
    }),
    Object.freeze({
      name: 'input.keyboard',
      delta: 3,
      deterministic: true
    }),
    Object.freeze({
      name: 'networking.replication',
      delta: 2,
      deterministic: true
    })
  ])
});

const SYSTEM_DEFINITION_BY_NAME = Object.freeze(
  Object.fromEntries(SYSTEM_REGISTRY_V1.systems.map((definition) => [definition.name, definition]))
);

export function getSystemRegistryV1() {
  return SYSTEM_REGISTRY_V1;
}

export function getKnownSystemDefinition(systemName) {
  return SYSTEM_DEFINITION_BY_NAME[systemName];
}

