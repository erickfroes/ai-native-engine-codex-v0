import { buildWorldSnapshotMessage } from '../network/world-snapshot.mjs';
import { generateReplaySignature } from './replay-signature.mjs';

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

function mix(state, value) {
  return (Math.imul(state, 1664525) + value + 1013904223) >>> 0;
}

function hashString(value) {
  let state = 0;
  for (const char of value) {
    state = mix(state, char.codePointAt(0));
  }
  return state;
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
      state = mix(state, tick);
      state = mix(state, hashString(systemName));
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
