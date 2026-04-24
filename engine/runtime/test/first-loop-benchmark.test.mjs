import test from 'node:test';
import assert from 'node:assert/strict';

import {
  benchmarkFirstSystemLoop,
  formatFirstLoopBenchmarkReport
} from '../src/systems/benchmark-first-loop.mjs';

test('benchmarks first loop and exposes aggregate metrics', async () => {
  const report = await benchmarkFirstSystemLoop('./scenes/tutorial.scene.json', {
    ticks: 2,
    runs: 3
  });

  assert.equal(report.ticks, 2);
  assert.equal(report.runs, 3);
  assert.equal(report.metrics.durationsMs.length, 3);
  assert.ok(report.metrics.avgDurationMs >= 0);
  assert.ok(report.metrics.maxDurationMs >= report.metrics.minDurationMs);
  assert.equal(report.lastReport.healthByEntity['player.hero'], 98);
});

test('normalizes invalid benchmark options to defaults', async () => {
  const report = await benchmarkFirstSystemLoop('./scenes/tutorial.scene.json', {
    ticks: 0,
    runs: -1
  });

  assert.equal(report.ticks, 3);
  assert.equal(report.runs, 5);
  assert.equal(report.metrics.durationsMs.length, 5);
});

test('formats benchmark report with core metrics', () => {
  const text = formatFirstLoopBenchmarkReport({
    scenePath: './scenes/tutorial.scene.json',
    ticks: 3,
    runs: 2,
    metrics: {
      totalDurationMs: 1.5,
      avgDurationMs: 0.75,
      minDurationMs: 0.7,
      maxDurationMs: 0.8,
      durationsMs: [0.7, 0.8]
    },
    lastReport: {
      affectedEntities: 1,
      healthByEntity: {
        'player.hero': 97
      }
    }
  });

  assert.match(text, /Runs: 2/);
  assert.match(text, /avg\/min\/max/);
  assert.match(text, /Last run affected entities: 1/);
});
