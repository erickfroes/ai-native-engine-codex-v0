import { runDeterministicReplay } from '../replay/run-deterministic-replay.mjs';
import { runResolvedSystem } from './system-handlers.mjs';
import { createLoopSchedule } from './loop-scheduler.mjs';

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
    const inputIntent = options.inputIntentResolver?.(tickPlan.tick);
    const tickSystems = [];

    for (const system of tickPlan.systems) {
      const stateBefore = state;
      const stateAfter = runResolvedSystem(system.name, { state, tick: tickPlan.tick, seed, inputIntent });

      tickSystems.push({
        name: system.name,
        delta: stateAfter - stateBefore,
        stateBefore,
        stateAfter
      });

      executedSystems.push(system.name);
      state = stateAfter;
    }

    tracedSystemsPerTick.push({
      tick: tickPlan.tick,
      systems: tickSystems
    });
  }

  return {
    report: {
      loopReportVersion: 1,
      scene: schedule.scene,
      ticks,
      seed,
      ticksExecuted: ticks,
      finalState: state,
      executedSystems
    },
    trace: {
      traceVersion: 1,
      scene: schedule.scene,
      ticks,
      seed,
      ticksExecuted: ticks,
      systemsPerTick: tracedSystemsPerTick
    }
  };
}
