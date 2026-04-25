import { readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  validateSceneFile,
  formatValidationReport,
  validateLoopScene,
  formatSceneValidationReportV1,
  validateSaveFile,
  loadValidatedInputIntentV1,
  loadSceneFile,
  buildWorldSnapshotMessage,
  runDeterministicReplay,
  buildReplayArtifact,
  createLoopExecutionPlan,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace,
  createInitialStateFromScene,
  snapshotStateV1,
  simulateStateV1,
  simulateStateV1WithMutationTrace
} from './index.mjs';

function printUsage() {
  console.log(`Usage:
  node engine/runtime/src/cli.mjs validate-scene <path> [--json]
  node engine/runtime/src/cli.mjs validate-save <path> [--json]
  node engine/runtime/src/cli.mjs describe-scene <path> [--json]
  node engine/runtime/src/cli.mjs emit-world-snapshot <path> [--json]
  node engine/runtime/src/cli.mjs run-replay <path> --ticks <n> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs plan-loop <path> --ticks <n> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs inspect-state <path> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs simulate-state <path> --ticks <n> [--seed <n>] [--json] [--trace]
  node engine/runtime/src/cli.mjs run-loop <path> --ticks <n> [--seed <n>] [--input-intent <path>] [--json] [--trace]
  node engine/runtime/src/cli.mjs run-replay-artifact <path> --ticks <n> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs validate-all-scenes [dir] [--json]`);
}

async function collectSceneFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const found = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'invalid') {
        continue;
      }
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

function readNumberFlag(commandName, flag, fallbackValue) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallbackValue;
  }

  const rawValue = process.argv[index + 1];
  if (!rawValue) {
    throw new Error(`${commandName}: ${flag} requires an integer value`);
  }

  const numericValue = Number(rawValue);
  if (!Number.isInteger(numericValue)) {
    throw new Error(`${commandName}: ${flag} must be an integer`);
  }

  return numericValue;
}

function readStringFlag(commandName, flag, fallbackValue) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallbackValue;
  }

  const rawValue = process.argv[index + 1];
  if (!rawValue || rawValue.startsWith('--')) {
    throw new Error(`${commandName}: ${flag} requires a path value`);
  }

  return rawValue;
}

async function run() {
  const [, , command, maybePath] = process.argv;
  const asJson = hasFlag('--json');

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

    const report = await validateLoopScene(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatSceneValidationReportV1(report));
    }
    process.exitCode = report.valid ? 0 : 1;
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
      console.log(`Save: ${report.path}`);
      console.log(`Version: ${report.save.saveVersion}`);
      console.log(`Content version: ${report.save.contentVersion}`);
      console.log(`Seed: ${report.save.seed}`);
      console.log(`Payload ref: ${report.save.payloadRef}`);
      console.log('');
      console.log(report.ok ? 'Status: OK' : 'Status: INVALID');
      if (report.errors.length > 0) {
        console.log('');
        console.log('Errors:');
        for (const error of report.errors) {
          console.log(`- ${error.path}: ${error.message}`);
        }
      }
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

  if (command === 'emit-world-snapshot') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const scene = await loadSceneFile(maybePath);
    const message = buildWorldSnapshotMessage(scene);

    if (asJson) {
      console.log(JSON.stringify(message, null, 2));
    } else {
      console.log(`Opcode: ${message.opcode}`);
      console.log(`Version: ${message.version}`);
      console.log(`Direction: ${message.direction}`);
      console.log(`Reliability: ${message.reliability}`);
      console.log(`Tick: ${message.payload.tick}`);
      console.log('Replicated entities:');
      for (const entity of message.payload.entities) {
        const kinds = entity.components.map((component) => component.kind).join(', ');
        console.log(`- ${entity.id}: ${kinds}`);
      }
    }

    return;
  }

  if (command === 'run-replay') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--ticks')) {
      throw new Error('run-replay: --ticks is required');
    }

    const ticks = readNumberFlag('run-replay', '--ticks', 1);
    const seed = readNumberFlag('run-replay', '--seed', undefined);

    const scene = await loadSceneFile(maybePath);
    const replayReport = runDeterministicReplay(scene, { ticks, seed });
    const ciReplayReport = {
      ciPayloadVersion: 1,
      scene: scene.metadata.name,
      ticks: replayReport.ticks,
      seed: replayReport.seed,
      replaySignature: replayReport.replaySignature,
      snapshotOpcode: replayReport.snapshot.opcode
    };

    if (asJson) {
      console.log(JSON.stringify(ciReplayReport, null, 2));
    } else {
      console.log(`Scene: ${scene.metadata.name}`);
      console.log(`Ticks: ${replayReport.ticks}`);
      console.log(`Seed: ${replayReport.seed}`);
      console.log(`Executed systems: ${replayReport.executedSystemCount}`);
      console.log(`Final state: ${replayReport.finalState}`);
      console.log(`Final snapshot opcode: ${replayReport.snapshot.opcode}`);
      console.log(`Replay signature: ${replayReport.replaySignature}`);
    }

    return;
  }

  if (command === 'run-replay-artifact') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--ticks')) {
      throw new Error('run-replay-artifact: --ticks is required');
    }

    const ticks = readNumberFlag('run-replay-artifact', '--ticks', 1);
    const seed = readNumberFlag('run-replay-artifact', '--seed', undefined);

    const scene = await loadSceneFile(maybePath);
    const replay = runDeterministicReplay(scene, { ticks, seed });
    const artifact = buildReplayArtifact(scene.metadata.name, replay);

    if (asJson) {
      console.log(JSON.stringify(artifact, null, 2));
    } else {
      console.log(`Scene: ${artifact.scene}`);
      console.log(`Replay artifact version: ${artifact.replayArtifactVersion}`);
      console.log(`Ticks: ${artifact.ticks}`);
      console.log(`Seed: ${artifact.seed}`);
      console.log(`Replay signature: ${artifact.replaySignature}`);
      console.log(`Snapshot opcode: ${artifact.snapshotOpcode}`);
      console.log(`Executed systems: ${artifact.executedSystemCount}`);
      console.log(`Final state: ${artifact.finalState}`);
    }

    return;
  }

  if (command === 'inspect-state') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const seed = readNumberFlag('inspect-state', '--seed', undefined);
    const state = await createInitialStateFromScene(maybePath, { seed });
    const snapshot = snapshotStateV1(state);

    if (asJson) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.log(`Scene: ${snapshot.scene}`);
      console.log(`State snapshot version: ${snapshot.stateSnapshotVersion}`);
      console.log(`Seed: ${snapshot.seed}`);
      console.log(`Tick: ${snapshot.tick}`);
      console.log(`Entities: ${snapshot.entities.length}`);
    }

    return;
  }

  if (command === 'simulate-state') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--ticks')) {
      throw new Error('simulate-state: --ticks is required');
    }

    const ticks = readNumberFlag('simulate-state', '--ticks', 0);
    const seed = readNumberFlag('simulate-state', '--seed', undefined);
    const withTrace = hasFlag('--trace');

    if (withTrace) {
      const traced = await simulateStateV1WithMutationTrace(maybePath, { ticks, seed });

      if (asJson) {
        console.log(JSON.stringify(traced, null, 2));
      } else {
        console.log(`Scene: ${traced.report.scene}`);
        console.log(`State simulation report version: ${traced.report.stateSimulationReportVersion}`);
        console.log(`Ticks: ${traced.report.ticks}`);
        console.log(`Seed: ${traced.report.seed}`);
        console.log(`Ticks executed: ${traced.report.ticksExecuted}`);
        console.log(`Processors: ${traced.report.processors.map((processor) => processor.name).join(', ') || '(none)'}`);
        console.log(`Mutation trace version: ${traced.mutationTrace.stateMutationTraceVersion}`);
      }

      return;
    }

    const report = await simulateStateV1(maybePath, { ticks, seed });

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`State simulation report version: ${report.stateSimulationReportVersion}`);
      console.log(`Ticks: ${report.ticks}`);
      console.log(`Seed: ${report.seed}`);
      console.log(`Ticks executed: ${report.ticksExecuted}`);
      console.log(`Processors: ${report.processors.map((processor) => processor.name).join(', ') || '(none)'}`);
    }

    return;
  }

  if (command === 'plan-loop') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--ticks')) {
      throw new Error('plan-loop: --ticks is required');
    }

    const ticks = readNumberFlag('plan-loop', '--ticks', 1);
    const seed = readNumberFlag('plan-loop', '--seed', undefined);
    const plan = await createLoopExecutionPlan(maybePath, { ticks, seed });

    if (asJson) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      console.log(`Scene: ${plan.scene}`);
      console.log(`Execution plan version: ${plan.executionPlanVersion}`);
      console.log(`Ticks: ${plan.ticks}`);
      console.log(`Seed: ${plan.seed}`);
      console.log(`Valid: ${plan.valid ? 'yes' : 'no'}`);
      console.log(`Planned ticks: ${plan.systemsPerTick.length}`);
      console.log(`Estimated final state: ${plan.estimated.finalState}`);
    }

    process.exitCode = plan.valid ? 0 : 1;
    return;
  }

  if (command === 'run-loop') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--ticks')) {
      throw new Error('run-loop: --ticks is required');
    }

    const ticks = readNumberFlag('run-loop', '--ticks', 1);
    const seed = readNumberFlag('run-loop', '--seed', undefined);
    const inputIntentPath = readStringFlag('run-loop', '--input-intent', undefined);
    const withTrace = hasFlag('--trace');
    const scene = await loadSceneFile(maybePath);
    const inputIntent = inputIntentPath
      ? await loadValidatedInputIntentV1(inputIntentPath)
      : undefined;

    if (withTrace) {
      const traced = runMinimalSystemLoopWithTrace(scene, { ticks, seed, inputIntent });

      if (asJson) {
        console.log(JSON.stringify(traced, null, 2));
      } else {
        console.log(`Scene: ${traced.report.scene}`);
        console.log(`Loop report version: ${traced.report.loopReportVersion}`);
        console.log(`Ticks: ${traced.report.ticks}`);
        console.log(`Seed: ${traced.report.seed}`);
        console.log(`Ticks executed: ${traced.report.ticksExecuted}`);
        console.log(`Final state: ${traced.report.finalState}`);
        console.log(`Executed systems: ${traced.report.executedSystems.join(', ') || '(none)'}`);
        console.log(`Trace version: ${traced.trace.traceVersion}`);
      }
      return;
    }

    const loopResult = runMinimalSystemLoop(scene, { ticks, seed, inputIntent });
    const loopReport = {
      loopReportVersion: 1,
      scene: scene.metadata.name,
      ticks,
      seed: seed ?? 1337,
      ticksExecuted: loopResult.ticksExecuted,
      finalState: loopResult.finalState,
      executedSystems: loopResult.executedSystems
    };

    if (asJson) {
      console.log(JSON.stringify(loopReport, null, 2));
    } else {
      console.log(`Scene: ${loopReport.scene}`);
      console.log(`Loop report version: ${loopReport.loopReportVersion}`);
      console.log(`Ticks: ${loopReport.ticks}`);
      console.log(`Seed: ${loopReport.seed}`);
      console.log(`Ticks executed: ${loopReport.ticksExecuted}`);
      console.log(`Final state: ${loopReport.finalState}`);
      console.log(`Executed systems: ${loopReport.executedSystems.join(', ') || '(none)'}`);
    }

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
