import { readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  validateSceneFile,
  formatValidationReport,
  loadSceneFile,
  validatePrefabFile,
  formatPrefabValidationReport,
  validateSceneAssetRefs,
  formatSceneAssetValidationReport,
  runFirstSystemLoop,
  formatFirstSystemLoopReport,
  replayFirstSystemLoop,
  formatReplayFirstLoopReport,
  verifyReplayDeterminism,
  formatReplayDeterminismReport,
  captureFirstLoopReplay,
  playbackFirstLoopReplayArtifact,
  formatReplayArtifactPlaybackReport,
  benchmarkFirstSystemLoop,
  formatFirstLoopBenchmarkReport,
  validateSaveFile,
  formatSaveValidationReport,
  validateInputBindingsFile,
  formatInputValidationReport,
  loadWorldFromSceneFile,
  summarizeWorld,
  formatWorldSummary,
  inspectSceneHierarchyFile,
  formatSceneHierarchyReport,
  validateUILayoutFile,
  formatUILayoutReport,
  validateRenderProfileFile,
  formatRenderValidationReport,
  validateNetMessageFile,
  formatNetMessageValidationReport,
  diffNetworkSnapshotFiles,
  formatNetworkSnapshotDiffReport,
  validateNetworkSnapshotSequence,
  formatNetworkSnapshotSequenceReport,
  simulateNetworkReplication,
  formatNetworkReplicationSimulationReport
} from './index.mjs';

function printUsage() {
  console.log(`Usage:
  node engine/runtime/src/cli.mjs validate-scene <path> [--json]
  node engine/runtime/src/cli.mjs describe-scene <path> [--json]
  node engine/runtime/src/cli.mjs validate-prefab <path> [--json]
  node engine/runtime/src/cli.mjs validate-scene-assets <scenePath> <manifestPath> [--json]
  node engine/runtime/src/cli.mjs run-first-loop <scenePath> [ticks] [--json]
  node engine/runtime/src/cli.mjs replay-first-loop <scenePath> [ticks] [--json]
  node engine/runtime/src/cli.mjs verify-replay-determinism <scenePath> [ticks] [runs] [--json]
  node engine/runtime/src/cli.mjs capture-first-loop-replay <scenePath> <outputPath> [ticks] [--json]
  node engine/runtime/src/cli.mjs playback-first-loop-replay <replayPath> [scenePathOverride] [--json]
  node engine/runtime/src/cli.mjs benchmark-first-loop <scenePath> [ticks] [runs] [--json]
  node engine/runtime/src/cli.mjs validate-save <savePath> [--json]
  node engine/runtime/src/cli.mjs validate-input <inputPath> [--json]
  node engine/runtime/src/cli.mjs inspect-world <scenePath> [--json]
  node engine/runtime/src/cli.mjs inspect-scene-hierarchy <scenePath> [--json]
  node engine/runtime/src/cli.mjs validate-ui <uiPath> [--json]
  node engine/runtime/src/cli.mjs validate-render <renderPath> [--json]
  node engine/runtime/src/cli.mjs validate-network <messagePath> [--json]
  node engine/runtime/src/cli.mjs diff-network-snapshots <beforePath> <afterPath> [--json]
  node engine/runtime/src/cli.mjs validate-network-sequence <beforePath> <afterPath> [--json]
  node engine/runtime/src/cli.mjs simulate-network-replication <snapshotA> <snapshotB> [...snapshotN] [--json]
  node engine/runtime/src/cli.mjs validate-all-scenes [dir] [--json]

Options:
  --component-kind=<kind>   Filter inspect-world / inspect-scene-hierarchy by component kind.
  --system-name=<name>      Filter inspect-world / inspect-scene-hierarchy by declared scene system.`);
}

async function collectSceneFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const found = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      found.push(...await collectSceneFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.scene.json')) {
      found.push(absolutePath);
    }
  }

  return found.sort();
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getOptionValue(optionName) {
  const prefix = `--${optionName}=`;
  const option = process.argv.find((arg) => arg.startsWith(prefix));
  return option ? option.slice(prefix.length) : null;
}

async function run() {
  const [, , command, maybePath] = process.argv;
  const asJson = hasFlag('--json');
  const componentKind = getOptionValue('component-kind');
  const systemName = getOptionValue('system-name');

  if (!command) {
    printUsage();
    process.exitCode = 2;
    return;
  }

  if (command === 'validate-scene') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateSceneFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatValidationReport(report));
    }
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === 'describe-scene') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const scene = await loadSceneFile(maybePath);
    const description = {
      name: scene.metadata.name,
      systems: scene.systems ?? [],
      entities: (scene.entities ?? []).map((entity) => ({
        id: entity.id,
        name: entity.name ?? null,
        components: (entity.components ?? []).map((component) => component.kind)
      }))
    };

    if (asJson) {
      console.log(JSON.stringify(description, null, 2));
    } else {
      console.log(`Scene: ${description.name}`);
      console.log(`Systems: ${description.systems.join(', ') || '(none)'}`);
      console.log('Entities:');
      for (const entity of description.entities) {
        console.log(`- ${entity.id} (${entity.name ?? 'unnamed'}): ${entity.components.join(', ')}`);
      }
    }
    return;
  }


  if (command === 'validate-prefab') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validatePrefabFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatPrefabValidationReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }


  if (command === 'validate-scene-assets') {
    const manifestPath = process.argv[4];
    if (!maybePath || !manifestPath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateSceneAssetRefs(maybePath, manifestPath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatSceneAssetValidationReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }


  if (command === 'run-first-loop') {
    const ticksRaw = process.argv[4];
    const ticks = ticksRaw && ticksRaw !== '--json' ? Number.parseInt(ticksRaw, 10) : 1;
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await runFirstSystemLoop(maybePath, ticks);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatFirstSystemLoopReport(report));
    }

    return;
  }



  if (command === 'replay-first-loop') {
    const ticksRaw = process.argv[4];
    const ticks = ticksRaw && ticksRaw !== '--json' ? Number.parseInt(ticksRaw, 10) : 3;
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await replayFirstSystemLoop(maybePath, ticks);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReplayFirstLoopReport(report));
    }

    return;
  }

  if (command === 'verify-replay-determinism') {
    const ticksRaw = process.argv[4];
    const runsRaw = process.argv[5];
    const ticks = ticksRaw && ticksRaw !== '--json' ? Number.parseInt(ticksRaw, 10) : 3;
    const runs = runsRaw && runsRaw !== '--json' ? Number.parseInt(runsRaw, 10) : 2;
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await verifyReplayDeterminism(maybePath, { ticks, runs });
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReplayDeterminismReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === 'capture-first-loop-replay') {
    const outputPath = process.argv[4];
    const ticksRaw = process.argv[5];
    const ticks = ticksRaw && ticksRaw !== '--json' ? Number.parseInt(ticksRaw, 10) : 3;
    if (!maybePath || !outputPath || outputPath === '--json') {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await captureFirstLoopReplay(maybePath, outputPath, ticks);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Replay captured at: ${report.outputPath}`);
      console.log(`Digest: ${report.artifact.digest}`);
      console.log(`Ticks: ${report.artifact.ticks}`);
    }

    return;
  }

  if (command === 'playback-first-loop-replay') {
    const scenePathOverride = process.argv[4] && process.argv[4] !== '--json' ? process.argv[4] : null;
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await playbackFirstLoopReplayArtifact(maybePath, scenePathOverride);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReplayArtifactPlaybackReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }



  if (command === 'benchmark-first-loop') {
    const ticksRaw = process.argv[4];
    const runsRaw = process.argv[5];
    const ticks = ticksRaw && ticksRaw !== '--json' ? Number.parseInt(ticksRaw, 10) : 3;
    const runs = runsRaw && runsRaw !== '--json' ? Number.parseInt(runsRaw, 10) : 5;
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await benchmarkFirstSystemLoop(maybePath, { ticks, runs });
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatFirstLoopBenchmarkReport(report));
    }

    return;
  }

  if (command === 'validate-save') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateSaveFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatSaveValidationReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }


  if (command === 'validate-input') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateInputBindingsFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatInputValidationReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }


  if (command === 'inspect-world') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const world = await loadWorldFromSceneFile(maybePath);
    const summary = summarizeWorld(world, { componentKind, systemName });
    if (asJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(formatWorldSummary(summary));
    }

    return;
  }

  if (command === 'inspect-scene-hierarchy') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await inspectSceneHierarchyFile(maybePath, { componentKind, systemName });
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatSceneHierarchyReport(report));
    }

    return;
  }


  if (command === 'validate-ui') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateUILayoutFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatUILayoutReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }


  if (command === 'validate-render') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateRenderProfileFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatRenderValidationReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }


  if (command === 'validate-network') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateNetMessageFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatNetMessageValidationReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }


  if (command === 'diff-network-snapshots') {
    const afterPath = process.argv[4];
    if (!maybePath || !afterPath || afterPath === '--json') {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await diffNetworkSnapshotFiles(maybePath, afterPath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatNetworkSnapshotDiffReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === 'validate-network-sequence') {
    const afterPath = process.argv[4];
    if (!maybePath || !afterPath || afterPath === '--json') {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateNetworkSnapshotSequence(maybePath, afterPath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatNetworkSnapshotSequenceReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === 'simulate-network-replication') {
    const snapshotPaths = process.argv.slice(3).filter((arg) => arg !== '--json');
    if (snapshotPaths.length < 2) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await simulateNetworkReplication(snapshotPaths);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatNetworkReplicationSimulationReport(report));
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === 'validate-all-scenes') {
    const sceneDir = path.resolve(maybePath ?? './scenes');
    const files = await collectSceneFiles(sceneDir);
    const reports = [];

    for (const file of files) {
      reports.push(await validateSceneFile(file));
    }

    const ok = reports.every((report) => report.ok);
    if (asJson) {
      console.log(JSON.stringify(reports, null, 2));
    } else {
      for (const report of reports) {
        console.log(formatValidationReport(report));
        console.log('');
      }
      console.log(`Summary: ${reports.filter((report) => report.ok).length}/${reports.length} valid scene(s)`);
    }

    process.exitCode = ok ? 0 : 1;
    return;
  }

  printUsage();
  process.exitCode = 2;
}

run().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
