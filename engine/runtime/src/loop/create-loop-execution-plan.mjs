import { validateLoopScene } from '../scene/validate-loop-scene.mjs';

const DEFAULT_SEED = 1337;

function normalizeTicks(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('ticks must be an integer >= 0');
  }
  return value;
}

function normalizeSeed(value) {
  if (value === undefined) {
    return DEFAULT_SEED;
  }

  if (!Number.isInteger(value)) {
    throw new Error('seed must be an integer');
  }

  return value;
}

function toPlannedSystem(system, order) {
  return {
    name: system.name,
    known: system.known,
    ...(system.delta === undefined ? {} : { delta: system.delta }),
    ...(system.deterministic === undefined ? {} : { deterministic: system.deterministic }),
    order
  };
}

export async function createLoopExecutionPlan(scenePath, options = {}) {
  const ticks = normalizeTicks(options.ticks ?? 1);
  const seed = normalizeSeed(options.seed);
  const validation = await validateLoopScene(scenePath);
  const valid = validation.valid;

  if (!valid) {
    return {
      executionPlanVersion: 1,
      scene: validation.scene,
      ticks,
      seed,
      valid,
      validation,
      systemsPerTick: [],
      estimated: {
        initialState: seed,
        totalDelta: 0,
        finalState: seed
      }
    };
  }

  const perTickSystems = validation.systems.map((system, index) => toPlannedSystem(system, index));
  const systemsPerTick = [];

  for (let tick = 1; tick <= ticks; tick += 1) {
    systemsPerTick.push({
      tick,
      systems: perTickSystems
    });
  }

  const deltaPerTick = perTickSystems.reduce((sum, system) => sum + (system.delta ?? 0), 0);
  const totalDelta = deltaPerTick * ticks;

  return {
    executionPlanVersion: 1,
    scene: validation.scene,
    ticks,
    seed,
    valid,
    validation,
    systemsPerTick,
    estimated: {
      initialState: seed,
      totalDelta,
      finalState: (seed + totalDelta) >>> 0
    }
  };
}

