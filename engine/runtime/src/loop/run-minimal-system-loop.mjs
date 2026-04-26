import { runResolvedSystem } from './system-handlers.mjs';
import { createLoopSchedule } from './loop-scheduler.mjs';

function executeLoopSchedule(schedule, options = {}) {
  const { seed, systemsPerTick } = schedule;
  let state = seed >>> 0;
  const executedSystems = [];
  const tracedSystemsPerTick = [];
  const movementBlocking = options.movementBlocking === true;

  for (const tickPlan of systemsPerTick) {
    const inputIntent = options.inputIntentResolver?.(tickPlan.tick) ?? options.inputIntent;
    const tickSystems = [];

    for (const system of tickPlan.systems) {
      const stateBefore = state;
      const stateAfter = runResolvedSystem(system.name, {
        state,
        tick: tickPlan.tick,
        seed,
        inputIntent,
        scene: options.scene,
        movementBlocking
      });

      if (options.trace === true) {
        tickSystems.push({
          name: system.name,
          delta: stateAfter - stateBefore,
          stateBefore,
          stateAfter
        });
      }

      executedSystems.push(system.name);
      state = stateAfter;
    }

    if (options.trace === true) {
      tracedSystemsPerTick.push({
        tick: tickPlan.tick,
        systems: tickSystems
      });
    }
  }

  return {
    finalState: state,
    executedSystems,
    tracedSystemsPerTick
  };
}

export function runMinimalSystemLoop(scene, options = {}) {
  const schedule = createLoopSchedule(scene, options);
  const executed = executeLoopSchedule(schedule, {
    inputIntent: options.inputIntent,
    inputIntentResolver: options.inputIntentResolver,
    movementBlocking: options.movementBlocking === true,
    scene
  });

  return {
    ticksExecuted: schedule.ticks,
    executedSystems: executed.executedSystems,
    finalState: executed.finalState
  };
}

export function runMinimalSystemLoopWithTrace(scene, options = {}) {
  const schedule = createLoopSchedule(scene, options);
  const { ticks, seed, systemsPerTick } = schedule;
  const executed = executeLoopSchedule(schedule, {
    inputIntent: options.inputIntent,
    inputIntentResolver: options.inputIntentResolver,
    movementBlocking: options.movementBlocking === true,
    scene,
    trace: true
  });

  return {
    report: {
      loopReportVersion: 1,
      scene: schedule.scene,
      ticks,
      seed,
      ticksExecuted: ticks,
      finalState: executed.finalState,
      executedSystems: executed.executedSystems
    },
    trace: {
      traceVersion: 1,
      scene: schedule.scene,
      ticks,
      seed,
      ticksExecuted: ticks,
      systemsPerTick: executed.tracedSystemsPerTick
    }
  };
}
