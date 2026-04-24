import { validateLoopScene } from '../scene/validate-loop-scene.mjs';
import { loadSceneFile } from '../scene/load-scene.mjs';
import { createLoopSchedule } from './loop-scheduler.mjs';

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

  const sceneData = await loadSceneFile(scenePath);
  const schedule = createLoopSchedule(sceneData, {
    ticks,
    seed,
    scenePath
  });
  const systemsPerTick = schedule.systemsPerTick;
  const deltaPerTick = (systemsPerTick[0]?.systems ?? []).reduce((sum, system) => sum + (system.delta ?? 0), 0);
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
