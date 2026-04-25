import { sha256Hex } from '../save/canonical-json.mjs';

function signatureInputFromReplay(replay) {
  return {
    seed: replay.seed,
    ticks: replay.ticks,
    finalState: replay.finalState,
    executedSystemCount: replay.executedSystemCount,
    systemExecutionOrder: replay.systemExecutionOrder,
    snapshot: replay.snapshot
  };
}

export function generateReplaySignature(replay) {
  return sha256Hex(signatureInputFromReplay(replay));
}
