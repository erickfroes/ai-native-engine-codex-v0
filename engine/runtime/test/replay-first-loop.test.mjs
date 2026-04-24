import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { replayFirstSystemLoop, formatReplayFirstLoopReport } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('builds deterministic replay frames for first loop simulation', async () => {
  const report = await replayFirstSystemLoop(scenePath('tutorial.scene.json'), 3);

  assert.equal(report.ticks, 3);
  assert.equal(report.frames.length, 3);
  assert.equal(report.frames[0].healthByEntity['player.hero'], 99);
  assert.equal(report.frames[2].healthByEntity['player.hero'], 97);
  assert.match(report.digest, /^djb2:/);
});

test('normalizes invalid tick count to replay default', async () => {
  const report = await replayFirstSystemLoop(scenePath('tutorial.scene.json'), 0);

  assert.equal(report.ticks, 3);
  assert.equal(report.frames.length, 3);
});

test('formats replay report with digest and frame list', async () => {
  const report = await replayFirstSystemLoop(scenePath('tutorial.scene.json'), 2);
  const formatted = formatReplayFirstLoopReport(report);

  assert.match(formatted, /Digest: djb2:/);
  assert.match(formatted, /tick 1: player\.hero:99/);
  assert.match(formatted, /tick 2: player\.hero:98/);
});
