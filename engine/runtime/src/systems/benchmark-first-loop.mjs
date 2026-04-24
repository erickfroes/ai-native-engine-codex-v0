import { runFirstSystemLoop } from './first-loop.mjs';

function toPositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function nanosecondsToMilliseconds(durationNs) {
  return Number(durationNs) / 1_000_000;
}

export async function benchmarkFirstSystemLoop(scenePath, options = {}) {
  const ticks = toPositiveInteger(options.ticks, 3);
  const runs = toPositiveInteger(options.runs, 5);

  const durationsMs = [];
  let lastReport = null;

  for (let run = 1; run <= runs; run += 1) {
    const startedAt = process.hrtime.bigint();
    lastReport = await runFirstSystemLoop(scenePath, ticks);
    const elapsedNs = process.hrtime.bigint() - startedAt;
    durationsMs.push(Number(nanosecondsToMilliseconds(elapsedNs).toFixed(3)));
  }

  const totalDurationMs = durationsMs.reduce((sum, value) => sum + value, 0);
  const minDurationMs = Math.min(...durationsMs);
  const maxDurationMs = Math.max(...durationsMs);

  return {
    scenePath,
    ticks,
    runs,
    metrics: {
      totalDurationMs: Number(totalDurationMs.toFixed(3)),
      avgDurationMs: Number((totalDurationMs / runs).toFixed(3)),
      minDurationMs: Number(minDurationMs.toFixed(3)),
      maxDurationMs: Number(maxDurationMs.toFixed(3)),
      durationsMs
    },
    lastReport
  };
}

export function formatFirstLoopBenchmarkReport(report) {
  const lines = [];
  lines.push(`Scene path: ${report.scenePath}`);
  lines.push(`Ticks per run: ${report.ticks}`);
  lines.push(`Runs: ${report.runs}`);
  lines.push(`Duration avg/min/max (ms): ${report.metrics.avgDurationMs}/${report.metrics.minDurationMs}/${report.metrics.maxDurationMs}`);
  lines.push(`Duration total (ms): ${report.metrics.totalDurationMs}`);
  lines.push('');
  lines.push(`Last run affected entities: ${report.lastReport?.affectedEntities ?? 0}`);
  lines.push(`Last run health entities: ${Object.keys(report.lastReport?.healthByEntity ?? {}).length}`);

  return lines.join('\n');
}
