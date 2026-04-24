import { createInitialStateFromScene, snapshotStateV1 } from './state-model-v1.mjs';
import {
  getStateProcessorRegistryV1,
  runStateProcessor,
  runStateProcessorsForTick
} from './state-processor-registry-v1.mjs';

function resolveSimulationInputs({ ticks, seed, processors } = {}) {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new Error('simulate-state: `ticks` must be an integer >= 0');
  }

  if (seed !== undefined && !Number.isInteger(seed)) {
    throw new Error('simulate-state: `seed` must be an integer when provided');
  }

  if (processors !== undefined) {
    if (!Array.isArray(processors) || processors.some((processorName) => typeof processorName !== 'string')) {
      throw new Error('simulate-state: `processors` must be an array of strings when provided');
    }
  }

  const resolvedProcessors = processors ?? ['movement.integrate'];
  return { ticks, seed, resolvedProcessors };
}

function resolveProcessorDefinitions(processors) {
  const registry = getStateProcessorRegistryV1();
  return processors.map((processorName) => {
    const definition = registry.processors.find((processor) => processor.name === processorName);
    if (!definition) {
      throw new Error(`unknown state processor: ${processorName}`);
    }

    return {
      name: definition.name,
      deterministic: definition.deterministic,
      requiredComponents: [...definition.requiredComponents]
    };
  });
}

export async function simulateStateV1(scenePath, { ticks, seed, processors } = {}) {
  const inputs = resolveSimulationInputs({ ticks, seed, processors });
  const state = await createInitialStateFromScene(scenePath, { seed: inputs.seed });
  const initialSnapshot = snapshotStateV1(state);
  const processorDefinitions = resolveProcessorDefinitions(inputs.resolvedProcessors);

  const steps = [];
  for (let tick = 1; tick <= inputs.ticks; tick += 1) {
    state.tick = tick;
    const processorResults = runStateProcessorsForTick(state, inputs.resolvedProcessors);
    steps.push({
      tick,
      processors: processorResults
    });
  }

  return {
    stateSimulationReportVersion: 1,
    scene: state.scene,
    ticks: inputs.ticks,
    seed: state.seed,
    ticksExecuted: inputs.ticks,
    processors: processorDefinitions,
    initialSnapshot,
    finalSnapshot: snapshotStateV1(state),
    steps
  };
}

function readAxis(component, axis, fallback = 0) {
  if (!component || typeof component !== 'object') {
    return fallback;
  }

  const fromFields = component.fields?.[axis];
  if (typeof fromFields === 'number' && Number.isFinite(fromFields)) {
    return fromFields;
  }

  const fromTopLevel = component[axis];
  if (typeof fromTopLevel === 'number' && Number.isFinite(fromTopLevel)) {
    return fromTopLevel;
  }

  return fallback;
}

function readTransformVector(entity) {
  const transform = entity?.components?.transform;
  if (!transform || typeof transform !== 'object') {
    return null;
  }

  return {
    x: readAxis(transform, 'x', 0),
    y: readAxis(transform, 'y', 0)
  };
}

function toFieldsChanged(before, after) {
  if (!before || !after) {
    return [];
  }

  const changed = [];
  if (before.x !== after.x) {
    changed.push('x');
  }
  if (before.y !== after.y) {
    changed.push('y');
  }
  return changed;
}

export async function simulateStateV1WithMutationTrace(scenePath, { ticks, seed, processors } = {}) {
  const inputs = resolveSimulationInputs({ ticks, seed, processors });
  const state = await createInitialStateFromScene(scenePath, { seed: inputs.seed });
  const initialSnapshot = snapshotStateV1(state);
  const processorDefinitions = resolveProcessorDefinitions(inputs.resolvedProcessors);

  const steps = [];
  const mutationsByTick = [];

  for (let tick = 1; tick <= inputs.ticks; tick += 1) {
    state.tick = tick;
    const processorResults = [];
    const processorMutations = [];

    for (const processorName of inputs.resolvedProcessors) {
      const transformBeforeByEntity = new Map();
      for (const entity of state.entities) {
        const before = readTransformVector(entity);
        if (before !== null) {
          transformBeforeByEntity.set(entity.id, before);
        }
      }

      const processorResult = runStateProcessor(state, processorName);
      processorResults.push(processorResult);

      const mutations = [];
      for (const entity of state.entities) {
        const before = transformBeforeByEntity.get(entity.id) ?? null;
        if (before === null) {
          continue;
        }

        const after = readTransformVector(entity);
        const fieldsChanged = toFieldsChanged(before, after);
        if (fieldsChanged.length === 0) {
          continue;
        }

        mutations.push({
          entityId: entity.id,
          component: 'transform',
          before,
          after,
          fieldsChanged
        });
      }

      processorMutations.push({
        name: processorName,
        mutations
      });
    }

    steps.push({
      tick,
      processors: processorResults
    });

    mutationsByTick.push({
      tick,
      processors: processorMutations
    });
  }

  const report = {
    stateSimulationReportVersion: 1,
    scene: state.scene,
    ticks: inputs.ticks,
    seed: state.seed,
    ticksExecuted: inputs.ticks,
    processors: processorDefinitions,
    initialSnapshot,
    finalSnapshot: snapshotStateV1(state),
    steps
  };

  const mutationTrace = {
    stateMutationTraceVersion: 1,
    scene: state.scene,
    ticks: inputs.ticks,
    seed: state.seed,
    ticksExecuted: inputs.ticks,
    mutationsByTick
  };

  return {
    report,
    mutationTrace
  };
}
