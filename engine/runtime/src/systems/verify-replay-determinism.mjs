import { replayFirstSystemLoop } from './replay-first-loop.mjs';

function toPositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function verifyReplayDeterminism(scenePath, options = {}) {
  const ticks = toPositiveInteger(options.ticks, 3);
  const runs = toPositiveInteger(options.runs, 2);

  const digests = [];
  for (let i = 0; i < runs; i += 1) {
    const replay = await replayFirstSystemLoop(scenePath, ticks);
    digests.push(replay.digest);
  }

  const uniqueDigests = [...new Set(digests)];

  return {
    scenePath,
    ticks,
    runs,
    ok: uniqueDigests.length === 1,
    digests,
    uniqueDigestCount: uniqueDigests.length,
    expectedDigest: uniqueDigests[0] ?? null
  };
}

export function formatReplayDeterminismReport(report) {
  const lines = [];
  lines.push(`Scene path: ${report.scenePath}`);
  lines.push(`Ticks: ${report.ticks}`);
  lines.push(`Runs: ${report.runs}`);
  lines.push(`Unique digests: ${report.uniqueDigestCount}`);
  lines.push(`Expected digest: ${report.expectedDigest ?? '(none)'}`);
  lines.push('');
  lines.push(report.ok ? 'Status: DETERMINISTIC' : 'Status: NON-DETERMINISTIC');

  lines.push('Digests:');
  report.digests.forEach((digest, index) => {
    lines.push(`- run ${index + 1}: ${digest}`);
  });

  return lines.join('\n');
}
