import { runDeterministicReplay } from '../replay/run-deterministic-replay.mjs';

export function runMinimalSystemLoop(scene, options = {}) {
  const replay = runDeterministicReplay(scene, options);

  return {
    ticksExecuted: replay.ticks,
    executedSystems: replay.systemExecutionOrder,
    finalState: replay.finalState
  };
}
