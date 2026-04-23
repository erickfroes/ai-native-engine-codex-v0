import { buildWorldSnapshotMessage } from '../network/world-snapshot.mjs';
import { generateReplaySignature } from './replay-signature.mjs';
import { runResolvedSystem } from '../loop/system-handlers.mjs';

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

export function runDeterministicReplay(scene, options = {}) {
  const ticks = normalizeTicks(options.ticks ?? 1);
  const seed = normalizeSeed(options.seed);
  const systems = Array.isArray(scene.systems) ? scene.systems : [];

  let state = seed >>> 0;
  const systemExecutionOrder = [];

  for (let tick = 1; tick <= ticks; tick += 1) {
    for (const systemName of systems) {
      systemExecutionOrder.push(systemName);
      state = runResolvedSystem(systemName, { state, tick, seed });
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
