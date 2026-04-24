import { getKnownSystemDefinition } from '../systems/system-registry.mjs';

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

function toScheduledSystem(name, order) {
  const definition = getKnownSystemDefinition(name);
  return {
    name,
    known: definition !== undefined,
    ...(definition === undefined ? {} : { delta: definition.delta, deterministic: definition.deterministic }),
    order
  };
}

export function createLoopSchedule(sceneData, options = {}) {
  const ticks = normalizeTicks(options.ticks ?? 1);
  const seed = normalizeSeed(options.seed);
  const systems = Array.isArray(sceneData?.systems) ? sceneData.systems : [];
  const scene = typeof sceneData?.metadata?.name === 'string'
    ? sceneData.metadata.name
    : (options.scenePath ?? 'unknown.scene');

  const perTickSystems = systems.map((name, order) => toScheduledSystem(name, order));
  const systemsPerTick = [];
  for (let tick = 1; tick <= ticks; tick += 1) {
    systemsPerTick.push({
      tick,
      systems: perTickSystems
    });
  }

  return {
    schedulerVersion: 1,
    scene,
    ticks,
    seed,
    systemsPerTick
  };
}

