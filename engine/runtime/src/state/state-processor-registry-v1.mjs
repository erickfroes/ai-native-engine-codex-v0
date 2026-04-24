function setAxis(component, axis, value) {
  if (component && typeof component === 'object' && component.fields && typeof component.fields === 'object') {
    component.fields[axis] = value;
    return;
  }

  component[axis] = value;
}

function readAxis(component, axis, fallback = 0) {
  if (!component || typeof component !== 'object') {
    return fallback;
  }

  const fieldsAxis = component.fields?.[axis];
  if (typeof fieldsAxis === 'number' && Number.isFinite(fieldsAxis)) {
    return fieldsAxis;
  }

  const topLevelAxis = component[axis];
  if (typeof topLevelAxis === 'number' && Number.isFinite(topLevelAxis)) {
    return topLevelAxis;
  }

  return fallback;
}

function runMovementIntegrate(stateModel) {
  const mutatedEntities = [];

  for (const entity of stateModel.entities) {
    const transform = entity.components?.transform;
    const velocity = entity.components?.velocity;

    if (!transform || !velocity) {
      continue;
    }

    const tx = readAxis(transform, 'x', 0);
    const ty = readAxis(transform, 'y', 0);
    const vx = readAxis(velocity, 'x', 0);
    const vy = readAxis(velocity, 'y', 0);

    setAxis(transform, 'x', tx + vx);
    setAxis(transform, 'y', ty + vy);

    mutatedEntities.push(entity.id);
  }

  return {
    name: 'movement.integrate',
    mutatedEntities
  };
}

const STATE_PROCESSOR_REGISTRY_V1 = Object.freeze({
  stateProcessorRegistryVersion: 1,
  processors: Object.freeze([
    Object.freeze({
      name: 'movement.integrate',
      version: 1,
      deterministic: true,
      requiredComponents: Object.freeze(['transform', 'velocity'])
    })
  ])
});

export function getStateProcessorRegistryV1() {
  return STATE_PROCESSOR_REGISTRY_V1;
}

export function listStateProcessors() {
  return STATE_PROCESSOR_REGISTRY_V1.processors.map((processor) => processor.name);
}

export function getStateProcessor(name) {
  return STATE_PROCESSOR_REGISTRY_V1.processors.find((processor) => processor.name === name) ?? null;
}

export function runStateProcessor(stateModel, processorName) {
  if (processorName === 'movement.integrate') {
    return runMovementIntegrate(stateModel);
  }

  throw new Error(`unknown state processor: ${processorName}`);
}

export function runStateProcessorsForTick(stateModel, processorNames) {
  return processorNames.map((processorName) => runStateProcessor(stateModel, processorName));
}
