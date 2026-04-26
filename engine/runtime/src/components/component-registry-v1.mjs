const COMPONENT_REGISTRY_V1 = Object.freeze({
  componentRegistryVersion: 1,
  components: Object.freeze([
    Object.freeze({
      name: 'transform',
      version: 1,
      deterministic: true,
      description: 'Position/rotation/scale component'
    }),
    Object.freeze({
      name: 'velocity',
      version: 1,
      deterministic: true,
      description: 'Linear velocity component'
    }),
    Object.freeze({
      name: 'visual.sprite',
      version: 1,
      deterministic: true,
      description: 'Declarative sprite visual component'
    }),
    Object.freeze({
      name: 'tile.layer',
      version: 1,
      deterministic: true,
      description: 'Declarative tile grid visual component'
    }),
    Object.freeze({
      name: 'camera.viewport',
      version: 1,
      deterministic: true,
      description: 'Declarative camera viewport component'
    }),
    Object.freeze({
      name: 'collision.bounds',
      version: 1,
      deterministic: true,
      description: 'Declarative collision bounds component'
    })
  ])
});

export function getComponentRegistryV1() {
  return COMPONENT_REGISTRY_V1;
}

export function listKnownComponents() {
  return COMPONENT_REGISTRY_V1.components.map((component) => component.name);
}

export function getKnownComponent(name) {
  return COMPONENT_REGISTRY_V1.components.find((component) => component.name === name) ?? null;
}

export function isKnownComponent(name) {
  return getKnownComponent(name) !== null;
}
