import { createHash } from 'node:crypto';

function canonicalStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }

  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

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
  const canonicalPayload = canonicalStringify(signatureInputFromReplay(replay));
  return createHash('sha256').update(canonicalPayload).digest('hex');
}
