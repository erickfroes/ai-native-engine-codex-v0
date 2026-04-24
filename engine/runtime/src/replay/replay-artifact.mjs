export function buildReplayArtifact(sceneName, replay) {
  return {
    replayArtifactVersion: 1,
    scene: sceneName,
    ticks: replay.ticks,
    seed: replay.seed,
    replaySignature: replay.replaySignature,
    snapshotOpcode: replay.snapshot.opcode,
    executedSystemCount: replay.executedSystemCount,
    finalState: replay.finalState
  };
}
