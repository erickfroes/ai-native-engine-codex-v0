import { runFirstSystemLoop } from './first-loop.mjs';

function hashText(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return `djb2:${hash >>> 0}`;
}

export async function replayFirstSystemLoop(scenePath, tickCount = 3) {
  const normalizedTickCount = Number.isInteger(tickCount) && tickCount > 0 ? tickCount : 3;
  const frames = [];

  for (let tick = 1; tick <= normalizedTickCount; tick += 1) {
    const snapshot = await runFirstSystemLoop(scenePath, tick);
    frames.push({
      tick,
      healthByEntity: snapshot.healthByEntity
    });
  }

  const digest = hashText(JSON.stringify(frames));

  return {
    scenePath,
    ticks: normalizedTickCount,
    frames,
    digest
  };
}

export function formatReplayFirstLoopReport(report) {
  const lines = [];
  lines.push(`Scene path: ${report.scenePath}`);
  lines.push(`Ticks: ${report.ticks}`);
  lines.push(`Frames: ${report.frames.length}`);
  lines.push(`Digest: ${report.digest}`);
  lines.push('');
  lines.push('Replay frames:');

  for (const frame of report.frames) {
    const entities = Object.entries(frame.healthByEntity)
      .map(([entityId, value]) => `${entityId}:${value}`)
      .join(', ');
    lines.push(`- tick ${frame.tick}: ${entities || '(no health entities)'}`);
  }

  return lines.join('\n');
}
