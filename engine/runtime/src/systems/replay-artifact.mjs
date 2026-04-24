import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

import { replayFirstSystemLoop } from './replay-first-loop.mjs';

const REPLAY_ARTIFACT_FORMAT = 'first-loop-replay.v1';

export async function captureFirstLoopReplay(scenePath, outputPath, tickCount = 3) {
  const replay = await replayFirstSystemLoop(scenePath, tickCount);
  const artifact = {
    format: REPLAY_ARTIFACT_FORMAT,
    createdAt: new Date().toISOString(),
    scenePath: replay.scenePath,
    ticks: replay.ticks,
    digest: replay.digest,
    frames: replay.frames
  };

  const absoluteOutputPath = path.resolve(outputPath);
  await writeFile(absoluteOutputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

  return {
    ok: true,
    outputPath: absoluteOutputPath,
    artifact
  };
}

export async function playbackFirstLoopReplayArtifact(replayPath, scenePathOverride = null) {
  const absoluteReplayPath = path.resolve(replayPath);
  const raw = await readFile(absoluteReplayPath, 'utf8');
  const artifact = JSON.parse(raw);

  const errors = [];
  if (artifact.format !== REPLAY_ARTIFACT_FORMAT) {
    errors.push({ path: '$.format', message: 'unsupported replay artifact format' });
  }

  const scenePath = scenePathOverride ?? artifact.scenePath;
  const replay = await replayFirstSystemLoop(scenePath, artifact.ticks);
  if (artifact.digest !== replay.digest) {
    errors.push({ path: '$.digest', message: 'replay digest mismatch' });
  }

  return {
    ok: errors.length === 0,
    replayPath: absoluteReplayPath,
    scenePath,
    expectedDigest: artifact.digest ?? null,
    actualDigest: replay.digest,
    ticks: artifact.ticks ?? null,
    errors
  };
}

export function formatReplayArtifactPlaybackReport(report) {
  const lines = [];
  lines.push(`Replay artifact: ${report.replayPath}`);
  lines.push(`Scene path: ${report.scenePath}`);
  lines.push(`Ticks: ${report.ticks ?? '(missing)'}`);
  lines.push(`Expected digest: ${report.expectedDigest ?? '(missing)'}`);
  lines.push(`Actual digest: ${report.actualDigest ?? '(missing)'}`);
  lines.push('');
  lines.push(report.ok ? 'Status: MATCH' : 'Status: MISMATCH');

  if (!report.ok) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      lines.push(`- ${error.path}: ${error.message}`);
    }
  }

  return lines.join('\n');
}
