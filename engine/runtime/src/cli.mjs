import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  validateSceneFile,
  formatValidationReport,
  validateLoopScene,
  formatSceneValidationReportV1,
  validateSaveFile,
  loadStateSnapshotSaveV1,
  saveStateSnapshotV1,
  validateInputIntentV1,
  validateInputIntentV1File,
  createInputIntentFromKeyboardV1,
  loadValidatedInputIntentV1,
  loadSceneFile,
  buildWorldSnapshotMessage,
  buildRenderSnapshotV1,
  renderSnapshotToSvgV1,
  RENDER_SVG_VERSION,
  runDeterministicReplay,
  buildReplayArtifact,
  createLoopExecutionPlan,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace,
  runLoopWithKeyboardInputScriptV1,
  createInitialStateFromScene,
  snapshotStateV1,
  simulateStateV1,
  simulateStateV1WithMutationTrace
} from './index.mjs';

function printUsage() {
  console.log(`Usage:
  node engine/runtime/src/cli.mjs validate-scene <path> [--json]
  node engine/runtime/src/cli.mjs validate-save <path> [--json]
  node engine/runtime/src/cli.mjs validate-input-intent <path> [--json]
  node engine/runtime/src/cli.mjs keyboard-to-input-intent --tick <n> --entity <id> --keys <comma-list> [--json]
  node engine/runtime/src/cli.mjs describe-scene <path> [--json]
  node engine/runtime/src/cli.mjs emit-world-snapshot <path> [--json]
  node engine/runtime/src/cli.mjs render-snapshot <path> [--tick <n>] [--width <n>] [--height <n>] [--json]
  node engine/runtime/src/cli.mjs render-svg <path> [--tick <n>] [--width <n>] [--height <n>] [--out <path>] [--json]
  node engine/runtime/src/cli.mjs save-state <path> --ticks <n> [--seed <n>] --out <dir> [--json]
  node engine/runtime/src/cli.mjs load-save <path> [--json]
  node engine/runtime/src/cli.mjs run-replay <path> --ticks <n> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs plan-loop <path> --ticks <n> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs inspect-state <path> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs simulate-state <path> --ticks <n> [--seed <n>] [--json] [--trace]
  node engine/runtime/src/cli.mjs run-loop <path> --ticks <n> [--seed <n>] [--input-intent <path>] [--keyboard-script <path>] [--json] [--trace]
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
  if (!rawValue || rawValue.trim().length === 0) {
    throw new Error(`${commandName}: ${flag} must be a non-empty string`);
  }

  return rawValue;
}

function readCommaListFlag(commandName, flag) {
  const rawValue = readStringFlag(commandName, flag, undefined);
  if (rawValue === undefined) {
    return undefined;
  }

  const values = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (values.length === 0) {
    throw new Error(`${commandName}: ${flag} must contain at least one key`);
  }

  return values;
}

function formatInputIntentAction(action) {
  if (action?.type !== 'move' || !action.axis || typeof action.axis !== 'object') {
    return action?.type ?? 'unknown';
  }

  return `move(${action.axis.x},${action.axis.y})`;
}

function formatInputIntentErrors(errors) {
  return errors.map((error) => `${error.path}: ${error.message}`).join('; ');
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

  if (command === 'validate-input-intent') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateInputIntentV1File(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Input intent: ${report.absolutePath}`);
      console.log(`Version: ${report.inputIntent?.inputIntentVersion ?? '(missing)'}`);
      console.log(`Tick: ${report.inputIntent?.tick ?? '(missing)'}`);
      console.log(`Entity: ${report.inputIntent?.entityId ?? '(missing)'}`);
      console.log(`Actions: ${(report.inputIntent?.actions ?? []).map(formatInputIntentAction).join(', ') || '(none)'}`);
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

  if (command === 'keyboard-to-input-intent') {
    if (!hasFlag('--tick')) {
      throw new Error('keyboard-to-input-intent: --tick is required');
    }

    if (!hasFlag('--entity')) {
      throw new Error('keyboard-to-input-intent: --entity is required');
    }

    if (!hasFlag('--keys')) {
      throw new Error('keyboard-to-input-intent: --keys is required');
    }

    const tick = readNumberFlag('keyboard-to-input-intent', '--tick', 1);
    const entityId = readStringFlag('keyboard-to-input-intent', '--entity', undefined);
    const keys = readCommaListFlag('keyboard-to-input-intent', '--keys');
    const inputIntent = createInputIntentFromKeyboardV1({ tick, entityId, keys });
    const validationReport = await validateInputIntentV1(inputIntent);

    if (!validationReport.ok) {
      throw new Error(
        `keyboard-to-input-intent produced invalid input intent: ${formatInputIntentErrors(validationReport.errors)}`
      );
    }

    console.log(JSON.stringify(inputIntent, null, 2));
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

  if (command === 'render-snapshot') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const tick = readNumberFlag('render-snapshot', '--tick', undefined);
    const width = readNumberFlag('render-snapshot', '--width', undefined);
    const height = readNumberFlag('render-snapshot', '--height', undefined);
    const snapshot = await buildRenderSnapshotV1(maybePath, { tick, width, height });

    if (asJson) {
      console.log(JSON.stringify(snapshot, null, 2));
    } else {
      console.log(`Scene: ${snapshot.scene}`);
      console.log(`Render snapshot version: ${snapshot.renderSnapshotVersion}`);
      console.log(`Tick: ${snapshot.tick}`);
      console.log(`Viewport: ${snapshot.viewport.width}x${snapshot.viewport.height}`);
      console.log(`Draw calls: ${snapshot.drawCalls.length}`);
    }

    return;
  }

  if (command === 'render-svg') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const tick = readNumberFlag('render-svg', '--tick', undefined);
    const width = readNumberFlag('render-svg', '--width', undefined);
    const height = readNumberFlag('render-svg', '--height', undefined);
    const requestedOutPath = readStringFlag('render-svg', '--out', undefined);
    const snapshot = await buildRenderSnapshotV1(maybePath, { tick, width, height });
    const svg = renderSnapshotToSvgV1(snapshot);
    const outputPath = requestedOutPath ? path.resolve(requestedOutPath) : undefined;

    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, svg, 'utf8');
    }

    const envelope = {
      svgVersion: RENDER_SVG_VERSION,
      scene: snapshot.scene,
      tick: snapshot.tick,
      ...(outputPath ? { outputPath } : {}),
      svg
    };

    if (asJson) {
      console.log(JSON.stringify(envelope, null, 2));
    } else if (outputPath) {
      console.log(outputPath);
    } else {
      process.stdout.write(svg);
    }

    return;
  }

  if (command === 'save-state') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--ticks')) {
      throw new Error('save-state: --ticks is required');
    }

    if (!hasFlag('--out')) {
      throw new Error('save-state: --out is required');
    }

    const ticks = readNumberFlag('save-state', '--ticks', 0);
    const seed = readNumberFlag('save-state', '--seed', undefined);
    const outDir = readStringFlag('save-state', '--out', undefined);
    const simulation = await simulateStateV1(maybePath, { ticks, seed });
    const saved = await saveStateSnapshotV1({
      snapshot: simulation.finalSnapshot,
      outDir,
      seed: simulation.seed,
      contentVersion: 1
    });
    const saveResult = {
      savePath: saved.savePath,
      payloadPath: saved.payloadPath,
      save: saved.envelope
    };

    if (asJson) {
      console.log(JSON.stringify(saveResult, null, 2));
    } else {
      console.log(`Save: ${saveResult.savePath}`);
      console.log(`Payload: ${saveResult.payloadPath}`);
      console.log(`Version: ${saveResult.save.saveVersion}`);
      console.log(`Content version: ${saveResult.save.contentVersion}`);
      console.log(`Seed: ${saveResult.save.seed}`);
      console.log(`Checksum: ${saveResult.save.checksum}`);
      console.log(`Payload ref: ${saveResult.save.payloadRef}`);
    }

    return;
  }

  if (command === 'load-save') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const loaded = await loadStateSnapshotSaveV1(maybePath);
    const loadResult = {
      savePath: loaded.savePath,
      payloadPath: loaded.payloadPath,
      save: loaded.envelope,
      snapshot: loaded.snapshot
    };

    if (asJson) {
      console.log(JSON.stringify(loadResult, null, 2));
    } else {
      console.log(`Save: ${loadResult.savePath}`);
      console.log(`Payload: ${loadResult.payloadPath}`);
      console.log(`Scene: ${loadResult.snapshot.scene}`);
      console.log(`Tick: ${loadResult.snapshot.tick}`);
      console.log(`Entities: ${loadResult.snapshot.entities.length}`);
      console.log(`Checksum: ${loadResult.save.checksum}`);
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
    const keyboardScriptPath = readStringFlag('run-loop', '--keyboard-script', undefined);
    const withTrace = hasFlag('--trace');

    if (keyboardScriptPath) {
      const result = await runLoopWithKeyboardInputScriptV1(maybePath, keyboardScriptPath, {
        ticks,
        seed,
        trace: withTrace
      });
      const scene = await loadSceneFile(maybePath);

      if (withTrace) {
        if (asJson) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Scene: ${result.report.scene}`);
          console.log(`Loop report version: ${result.report.loopReportVersion}`);
          console.log(`Ticks: ${result.report.ticks}`);
          console.log(`Seed: ${result.report.seed}`);
          console.log(`Ticks executed: ${result.report.ticksExecuted}`);
          console.log(`Final state: ${result.report.finalState}`);
          console.log(`Executed systems: ${result.report.executedSystems.join(', ') || '(none)'}`);
          console.log(`Trace version: ${result.trace.traceVersion}`);
        }
        return;
      }

      const loopReport = {
        loopReportVersion: 1,
        scene: scene.metadata.name,
        ticks,
        seed: seed ?? 1337,
        ticksExecuted: result.ticksExecuted,
        finalState: result.finalState,
        executedSystems: result.executedSystems
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
