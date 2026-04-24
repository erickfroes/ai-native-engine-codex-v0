import test from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyReplayDeterminism,
  formatReplayDeterminismReport
} from '../src/systems/verify-replay-determinism.mjs';

test('verifies deterministic replay digest across multiple runs', async () => {
  const report = await verifyReplayDeterminism('./scenes/tutorial.scene.json', {
    ticks: 3,
    runs: 3
  });

  assert.equal(report.ok, true);
  assert.equal(report.runs, 3);
  assert.equal(report.uniqueDigestCount, 1);
  assert.equal(report.digests.length, 3);
});

test('normalizes invalid verification options', async () => {
  const report = await verifyReplayDeterminism('./scenes/tutorial.scene.json', {
    ticks: 0,
    runs: -1
  });

  assert.equal(report.ticks, 3);
  assert.equal(report.runs, 2);
  assert.equal(report.ok, true);
});

test('formats replay determinism report with digest summary', () => {
  const text = formatReplayDeterminismReport({
    scenePath: './scenes/tutorial.scene.json',
    ticks: 3,
    runs: 2,
    ok: true,
    digests: ['djb2:1', 'djb2:1'],
    uniqueDigestCount: 1,
    expectedDigest: 'djb2:1'
  });

  assert.match(text, /Status: DETERMINISTIC/);
  assert.match(text, /Unique digests: 1/);
  assert.match(text, /run 1: djb2:1/);
});
