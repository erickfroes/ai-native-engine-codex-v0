import { buildWorldSnapshotMessage } from '../network/world-snapshot.mjs';
import { generateReplaySignature } from './replay-signature.mjs';
import { runResolvedSystem } from '../loop/system-handlers.mjs';
import { createLoopSchedule } from '../loop/loop-scheduler.mjs';

export function runDeterministicReplay(scene, options = {}) {
  const schedule = createLoopSchedule(scene, options);
  const { ticks, seed } = schedule;

  let state = seed >>> 0;
  const systemExecutionOrder = [];

  for (const tickPlan of schedule.systemsPerTick) {
    const inputIntent = options.inputIntentResolver?.(tickPlan.tick);

    for (const system of tickPlan.systems) {
      systemExecutionOrder.push(system.name);
      state = runResolvedSystem(system.name, { state, tick: tickPlan.tick, seed, inputIntent });
    }
  }

  const snapshot = buildWorldSnapshotMessage(scene, { tick: ticks });

  const replay = {
    seed,
    ticks,
    finalState: state,
    executedSystemCount: systemExecutionOrder.length,
    systemExecutionOrder,
    snapshot
  };

  return {
    ...replay,
    replaySignature: generateReplaySignature(replay)
  };
}
