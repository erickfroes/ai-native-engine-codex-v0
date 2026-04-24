import { runDeterministicReplay } from '../replay/run-deterministic-replay.mjs';
import { runResolvedSystem } from './system-handlers.mjs';
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

export function runMinimalSystemLoop(scene, options = {}) {
  const replay = runDeterministicReplay(scene, options);

  return {
    ticksExecuted: replay.ticks,
    executedSystems: replay.systemExecutionOrder,
    finalState: replay.finalState
  };
}

export function runMinimalSystemLoopWithTrace(scene, options = {}) {
  const schedule = createLoopSchedule(scene, options);
  const { ticks, seed, systemsPerTick } = schedule;

  let state = seed >>> 0;
  const executedSystems = [];
  const tracedSystemsPerTick = [];

  for (const tickPlan of systemsPerTick) {
    const tickSystems = [];

    for (const system of tickPlan.systems) {
      const stateBefore = state;
      const stateAfter = runResolvedSystem(system.name, { state, tick: tickPlan.tick, seed });
      tickSystems.push({
        name: system.name,
  const ticks = normalizeTicks(options.ticks ?? 1);
  const seed = normalizeSeed(options.seed);
  const systems = Array.isArray(scene.systems) ? scene.systems : [];

  let state = seed >>> 0;
  const executedSystems = [];
  const systemsPerTick = [];

  for (let tick = 1; tick <= ticks; tick += 1) {
    const tickSystems = [];

    for (const systemName of systems) {
      const stateBefore = state;
      const stateAfter = runResolvedSystem(systemName, { state, tick, seed });
      tickSystems.push({
        name: systemName,
        delta: stateAfter - stateBefore,
        stateBefore,
        stateAfter
      });
      executedSystems.push(system.name);
      state = stateAfter;
    }

    tracedSystemsPerTick.push({
      tick: tickPlan.tick,
      executedSystems.push(systemName);
      state = stateAfter;
    }

    systemsPerTick.push({
      tick,
      systems: tickSystems
    });
  }

  return {
    report: {
      loopReportVersion: 1,
      scene: scene.metadata.name,
      ticks,
      seed,
      ticksExecuted: ticks,
      finalState: state,
      executedSystems
    },
    trace: {
      traceVersion: 1,
      scene: scene.metadata.name,
      ticks,
      seed,
      ticksExecuted: ticks,
      systemsPerTick: tracedSystemsPerTick
      systemsPerTick
    }
  };
}
