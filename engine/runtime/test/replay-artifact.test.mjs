import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile } from 'node:fs/promises';

import {
  captureFirstLoopReplay,
  playbackFirstLoopReplayArtifact,
  formatReplayArtifactPlaybackReport
} from '../src/systems/replay-artifact.mjs';

test('captures replay artifact and validates playback match', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'replay-artifact-'));
  const replayPath = path.join(tempDir, 'tutorial.replay.json');

  const capture = await captureFirstLoopReplay('./scenes/tutorial.scene.json', replayPath, 3);
  assert.equal(capture.ok, true);

  const playback = await playbackFirstLoopReplayArtifact(replayPath);
  assert.equal(playback.ok, true);
  assert.equal(playback.expectedDigest, capture.artifact.digest);
});

test('reports digest mismatch during replay artifact playback', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'replay-artifact-invalid-'));
  const replayPath = path.join(tempDir, 'invalid.replay.json');

  await writeFile(
    replayPath,
    JSON.stringify({
      format: 'first-loop-replay.v1',
      scenePath: './scenes/tutorial.scene.json',
      ticks: 3,
      digest: 'djb2:0',
      frames: []
    })
  );

  const playback = await playbackFirstLoopReplayArtifact(replayPath);
  assert.equal(playback.ok, false);
  assert.ok(playback.errors.some((error) => error.path === '$.digest'));
});

test('formats artifact playback report with status', () => {
  const text = formatReplayArtifactPlaybackReport({
    ok: true,
    replayPath: '/tmp/a.replay.json',
    scenePath: './scenes/tutorial.scene.json',
    ticks: 3,
    expectedDigest: 'djb2:1',
    actualDigest: 'djb2:1',
    errors: []
  });

  assert.match(text, /Status: MATCH/);
  assert.match(text, /Expected digest: djb2:1/);
});
