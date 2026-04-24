import { createInitialStateFromScene, snapshotStateV1 } from './state-model-v1.mjs';
import {
  getStateProcessorRegistryV1,
  runStateProcessorsForTick
} from './state-processor-registry-v1.mjs';

export async function simulateStateV1(scenePath, { ticks, seed, processors } = {}) {
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
  const state = await createInitialStateFromScene(scenePath, { seed });
  const initialSnapshot = snapshotStateV1(state);
  const registry = getStateProcessorRegistryV1();

  const processorDefinitions = resolvedProcessors.map((processorName) => {
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

  const steps = [];
  for (let tick = 1; tick <= ticks; tick += 1) {
    state.tick = tick;
    const processorResults = runStateProcessorsForTick(state, resolvedProcessors);
    steps.push({
      tick,
      processors: processorResults
    });
  }

  return {
    stateSimulationReportVersion: 1,
    scene: state.scene,
    ticks,
    seed: state.seed,
    ticksExecuted: ticks,
    processors: processorDefinitions,
    initialSnapshot,
    finalSnapshot: snapshotStateV1(state),
    steps
  };
}
