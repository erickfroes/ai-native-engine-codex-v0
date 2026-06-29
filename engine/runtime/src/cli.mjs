import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  validateSceneFile,
  formatValidationReport,
  validateLoopScene,
  formatSceneValidationReportV1,
  validateSaveFile,
  buildAssetManifestValidationReportV1,
  buildAtlasMaterialManifestReportV1,
  loadStateSnapshotSaveV1,
  saveStateSnapshotV1,
  validateInputIntentV1,
  validateInputIntentV1File,
  createInputIntentFromKeyboardV1,
  loadValidatedInputIntentV1,
  validateUiExplicitInputV1,
  validateUiExplicitInputV1File,
  createUiExplicitInputFromKeyboardV1,
  loadValidatedUiExplicitInputV1,
  loadSceneFile,
  buildWorldSnapshotMessage,
  buildSceneTransitionReportV1,
  buildSceneCompositionManifestReportV1,
  buildRenderSnapshotV1,
  renderSnapshotToSvgV1,
  RENDER_SVG_VERSION,
  buildVisualRegressionBaselineReportV1,
  renderSvgDemoHtmlV1,
  SVG_DEMO_HTML_VERSION,
  renderCanvas2DDemoHtmlV1,
  CANVAS_2D_DEMO_VERSION,
  renderBrowserPlayableDemoHtmlV1,
  createBrowserPlayableDemoMetadataV1,
  BROWSER_PLAYABLE_DEMO_VERSION,
  materializeBrowserDemoAssetSrcV1,
  resolveAtlasMaterialRenderInputsV1,
  exportHtmlGameV1,
  exportPortableHtmlGameV2,
  runDeterministicReplay,
  buildReplayArtifact,
  createLoopExecutionPlan,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace,
  runLoopWithKeyboardInputScriptV1,
  createInitialStateFromScene,
  snapshotStateV1,
  simulateStateV1,
  simulateStateV1WithMutationTrace,
  buildCollisionBoundsReportV1,
  buildCollisionOverlapReportV1,
  buildMovementBlockingReportV1,
  buildTileCollisionReportV1,
  buildPathfindingGridReportV1,
  buildAudioLiteReportV1,
  buildUiSystemReportV1,
  buildUiNavigationFocusReportV1,
  buildUiActionSemanticsReportV1,
  buildUiInputStepReportV1,
  buildUiExplicitInputStepReportV1,
  buildUiLocalScreenStateReportV1,
  buildSpriteAnimationReportV1,
  buildPrefabValidationReportV1,
  buildPrefabUsageReportV1,
  buildPrefabUsageReportV2
} from './index.mjs';

function printUsage() {
  console.log(`Usage:
  node engine/runtime/src/cli.mjs validate-scene <path> [--json]
  node engine/runtime/src/cli.mjs validate-asset-manifest <path> [--json]
  node engine/runtime/src/cli.mjs inspect-atlas-material-manifest <path> [--json]
  node engine/runtime/src/cli.mjs validate-prefab <path> [--json]
  node engine/runtime/src/cli.mjs validate-save <path> [--json]
  node engine/runtime/src/cli.mjs validate-input-intent <path> [--json]
  node engine/runtime/src/cli.mjs keyboard-to-input-intent --tick <n> --entity <id> --keys <comma-list> [--json]
  node engine/runtime/src/cli.mjs validate-ui-explicit-input <path> [--json]
  node engine/runtime/src/cli.mjs keyboard-to-ui-explicit-input --tick <n> --keys <comma-list> [--json]
  node engine/runtime/src/cli.mjs describe-scene <path> [--json]
  node engine/runtime/src/cli.mjs emit-world-snapshot <path> [--json]
  node engine/runtime/src/cli.mjs inspect-scene-transition <from> <to> [--json]
  node engine/runtime/src/cli.mjs inspect-scene-composition <path> [--json]
  node engine/runtime/src/cli.mjs render-snapshot <path> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--json]
  node engine/runtime/src/cli.mjs render-svg <path> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--out <path>] [--json]
  node engine/runtime/src/cli.mjs inspect-visual-regression-baseline <path> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--json]
  node engine/runtime/src/cli.mjs render-svg-demo <path> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--out <path>] [--json]
  node engine/runtime/src/cli.mjs render-canvas-demo <path> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--out <path>] [--json]
  node engine/runtime/src/cli.mjs render-browser-demo <path> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--atlas-material-manifest <path>] [--movement-blocking] [--gameplay-hud] [--playable-save-load] [--audio-lite] [--sprite-animation] [--ui-system] [--ui-input-preview] [--out <path>] [--json]
  node engine/runtime/src/cli.mjs export-html-game <path> --out <path> [--asset-manifest <path>] [--movement-blocking] [--gameplay-hud] [--playable-save-load] [--audio-lite] [--ui-system] [--json]
  node engine/runtime/src/cli.mjs export-portable-html-game <path> --out <path> [--asset-manifest <path>] [--atlas-material-manifest <path>] [--movement-blocking] [--gameplay-hud] [--playable-save-load] [--audio-lite] [--sprite-animation] [--ui-system] [--json]
  node engine/runtime/src/cli.mjs save-state <path> --ticks <n> [--seed <n>] --out <dir> [--json]
  node engine/runtime/src/cli.mjs load-save <path> [--json]
  node engine/runtime/src/cli.mjs run-replay <path> --ticks <n> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs plan-loop <path> --ticks <n> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs inspect-state <path> [--seed <n>] [--json]
  node engine/runtime/src/cli.mjs inspect-collision-bounds <path> [--json]
  node engine/runtime/src/cli.mjs inspect-collision-overlaps <path> [--json]
  node engine/runtime/src/cli.mjs inspect-tile-collision <path> [--json]
  node engine/runtime/src/cli.mjs inspect-pathfinding-grid <path> [--json]
  node engine/runtime/src/cli.mjs inspect-movement-blocking <path> --input-intent <path> [--json]
  node engine/runtime/src/cli.mjs inspect-ui-input-step <path> --input-intent <path> [--json]
  node engine/runtime/src/cli.mjs inspect-ui-explicit-input-step <path> --ui-explicit-input <path> [--json]
  node engine/runtime/src/cli.mjs inspect-audio-lite <path> [--json]
  node engine/runtime/src/cli.mjs inspect-ui-system <path> [--json]
  node engine/runtime/src/cli.mjs inspect-ui-navigation-focus <path> [--json]
  node engine/runtime/src/cli.mjs inspect-ui-action-semantics <path> [--json]
  node engine/runtime/src/cli.mjs inspect-ui-local-screen-state <path> [--json]
  node engine/runtime/src/cli.mjs inspect-sprite-animation <path> [--json]
  node engine/runtime/src/cli.mjs inspect-prefab-usage <path> [--json]
  node engine/runtime/src/cli.mjs inspect-prefab-usage-v2 <path> [--json]
  node engine/runtime/src/cli.mjs simulate-state <path> --ticks <n> [--seed <n>] [--json] [--trace]
  node engine/runtime/src/cli.mjs run-loop <path> --ticks <n> [--seed <n>] [--input-intent <path>] [--keyboard-script <path>] [--movement-blocking] [--json] [--trace]
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

function formatUiExplicitInputAction(action) {
  if (action?.type === 'navigate') {
    return `navigate(${action.direction ?? 'missing'})`;
  }

  return action?.type ?? 'unknown';
}

function formatUiExplicitInputErrors(errors) {
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

  if (command === 'validate-asset-manifest') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildAssetManifestValidationReportV1(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Asset manifest: ${report.absolutePath}`);
      console.log(`Asset manifest validation report version: ${report.assetManifestValidationReportVersion}`);
      console.log(`Version: ${report.assetManifest?.assetManifestVersion ?? '(missing)'}`);
      console.log(`Assets: ${Array.isArray(report.assetManifest?.assets) ? report.assetManifest.assets.length : '(missing)'}`);
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

  if (command === 'inspect-atlas-material-manifest') {
    if (!maybePath || maybePath.startsWith('--')) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildAtlasMaterialManifestReportV1(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Atlas/material manifest: ${report.absolutePath}`);
      console.log(`Atlas/material manifest report version: ${report.atlasMaterialManifestReportVersion}`);
      console.log(`Asset manifest: ${report.assetManifestPath ?? '(missing)'}`);
      console.log(`Atlases: ${report.summary.atlasCount}`);
      console.log(`Regions: ${report.summary.regionCount}`);
      console.log(`Materials: ${report.summary.materialCount}`);
      console.log(`Sprite bindings: ${report.summary.spriteBindingCount}`);
      console.log(`Tile bindings: ${report.summary.tileBindingCount}`);
      console.log('');
      console.log(report.ok ? 'Status: OK' : 'Status: INVALID');
      if (report.errors.length > 0) {
        console.log('');
        console.log('Errors:');
        for (const error of report.errors) {
          const ref = error.ref === null ? '' : ` ${error.ref}`;
          console.log(`- ${error.target}${ref} ${error.path}: ${error.message}`);
        }
      }
      if (report.warnings.length > 0) {
        console.log('');
        console.log('Warnings:');
        for (const warning of report.warnings) {
          const ref = warning.ref === null ? '' : ` ${warning.ref}`;
          console.log(`- ${warning.target}${ref} ${warning.path}: ${warning.message}`);
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

  if (command === 'validate-ui-explicit-input') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateUiExplicitInputV1File(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`UI explicit input: ${report.absolutePath}`);
      console.log(`Version: ${report.uiExplicitInput?.uiExplicitInputVersion ?? '(missing)'}`);
      console.log(`Tick: ${report.uiExplicitInput?.tick ?? '(missing)'}`);
      console.log(`Action: ${formatUiExplicitInputAction(report.uiExplicitInput?.action)}`);
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

  if (command === 'keyboard-to-ui-explicit-input') {
    if (!hasFlag('--tick')) {
      throw new Error('keyboard-to-ui-explicit-input: --tick is required');
    }

    if (!hasFlag('--keys')) {
      throw new Error('keyboard-to-ui-explicit-input: --keys is required');
    }

    const tick = readNumberFlag('keyboard-to-ui-explicit-input', '--tick', 1);
    const keys = readCommaListFlag('keyboard-to-ui-explicit-input', '--keys');
    const uiExplicitInput = createUiExplicitInputFromKeyboardV1({ tick, keys });
    const validationReport = await validateUiExplicitInputV1(uiExplicitInput);

    if (!validationReport.ok) {
      throw new Error(
        `keyboard-to-ui-explicit-input produced invalid ui explicit input: ${formatUiExplicitInputErrors(validationReport.errors)}`
      );
    }

    console.log(JSON.stringify(uiExplicitInput, null, 2));
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

  if (command === 'inspect-scene-transition') {
    if (!maybePath || !process.argv[4] || process.argv[4].startsWith('--')) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildSceneTransitionReportV1({
      fromPath: maybePath,
      toPath: process.argv[4]
    });

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene transition report version: ${report.sceneTransitionReportVersion}`);
      console.log(report.ok ? 'Status: OK' : 'Status: INVALID');
      console.log(`From: ${report.from.scene ?? '(invalid)'} (${report.from.path})`);
      console.log(`To: ${report.to.scene ?? '(invalid)'} (${report.to.path})`);
      if (report.errors.length > 0) {
        console.log('');
        console.log('Errors:');
        for (const error of report.errors) {
          console.log(`- ${error.endpoint} ${error.path}: ${error.message}`);
        }
      }
      if (report.warnings.length > 0) {
        console.log('');
        console.log('Warnings:');
        for (const warning of report.warnings) {
          console.log(`- ${warning.endpoint} ${warning.path}: ${warning.message}`);
        }
      }
    }

    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === 'inspect-scene-composition') {
    if (!maybePath || maybePath.startsWith('--')) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildSceneCompositionManifestReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene composition manifest report version: ${report.sceneCompositionManifestReportVersion}`);
      console.log(report.ok ? 'Status: OK' : 'Status: INVALID');
      console.log(`Manifest: ${report.absolutePath}`);
      console.log(`Entry scene: ${report.entryScene ?? '(invalid)'}`);
      console.log(`Entry path: ${report.entryScenePath ?? '(invalid)'}`);
      console.log(`Scenes: ${report.scenes.length}`);
      for (const scene of report.scenes) {
        console.log(`- ${scene.ref ?? '(invalid)'}: ${scene.scene ?? '(invalid)'} (${scene.path})`);
      }
      if (report.errors.length > 0) {
        console.log('');
        console.log('Errors:');
        for (const error of report.errors) {
          const ref = error.ref === null ? '' : ` ${error.ref}`;
          console.log(`- ${error.target}${ref} ${error.path}: ${error.message}`);
        }
      }
      if (report.warnings.length > 0) {
        console.log('');
        console.log('Warnings:');
        for (const warning of report.warnings) {
          const ref = warning.ref === null ? '' : ` ${warning.ref}`;
          console.log(`- ${warning.target}${ref} ${warning.path}: ${warning.message}`);
        }
      }
    }

    process.exitCode = report.ok ? 0 : 1;
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
    const assetManifestPath = readStringFlag('render-snapshot', '--asset-manifest', undefined);
    const snapshot = await buildRenderSnapshotV1(maybePath, { tick, width, height, assetManifestPath });

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
    const assetManifestPath = readStringFlag('render-svg', '--asset-manifest', undefined);
    const requestedOutPath = readStringFlag('render-svg', '--out', undefined);
    const snapshot = await buildRenderSnapshotV1(maybePath, { tick, width, height, assetManifestPath });
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

  if (command === 'inspect-visual-regression-baseline') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const tick = readNumberFlag('inspect-visual-regression-baseline', '--tick', undefined);
    const width = readNumberFlag('inspect-visual-regression-baseline', '--width', undefined);
    const height = readNumberFlag('inspect-visual-regression-baseline', '--height', undefined);
    const assetManifestPath = readStringFlag('inspect-visual-regression-baseline', '--asset-manifest', undefined);
    const report = await buildVisualRegressionBaselineReportV1(maybePath, {
      tick,
      width,
      height,
      assetManifestPath
    });

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Visual regression baseline report version: ${report.visualRegressionBaselineReportVersion}`);
      console.log(`Tick: ${report.tick}`);
      console.log(`Viewport: ${report.viewport.width}x${report.viewport.height}`);
      console.log(
        `Draw calls: ${report.drawCallCount} (rect=${report.drawCallsByKind.rect}, sprite=${report.drawCallsByKind.sprite})`
      );
      console.log(`Snapshot hash: ${report.snapshotHash}`);
      console.log(`SVG hash: ${report.svgHash}`);
    }

    return;
  }

  if (command === 'render-svg-demo') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const tick = readNumberFlag('render-svg-demo', '--tick', undefined);
    const width = readNumberFlag('render-svg-demo', '--width', undefined);
    const height = readNumberFlag('render-svg-demo', '--height', undefined);
    const assetManifestPath = readStringFlag('render-svg-demo', '--asset-manifest', undefined);
    const requestedOutPath = readStringFlag('render-svg-demo', '--out', undefined);
    const snapshot = await buildRenderSnapshotV1(maybePath, { tick, width, height, assetManifestPath });
    const svg = renderSnapshotToSvgV1(snapshot);
    const html = renderSvgDemoHtmlV1({
      title: `${snapshot.scene} SVG Demo`,
      svg,
      metadata: {
        scene: snapshot.scene,
        svgVersion: RENDER_SVG_VERSION,
        tick: snapshot.tick,
        viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
      }
    });
    const outputPath = requestedOutPath ? path.resolve(requestedOutPath) : undefined;

    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, html, 'utf8');
    }

    const envelope = {
      demoHtmlVersion: SVG_DEMO_HTML_VERSION,
      scene: snapshot.scene,
      tick: snapshot.tick,
      ...(outputPath ? { outputPath } : {}),
      html
    };

    if (asJson) {
      console.log(JSON.stringify(envelope, null, 2));
    } else if (outputPath) {
      console.log(outputPath);
    } else {
      process.stdout.write(html);
    }

    return;
  }

  if (command === 'render-canvas-demo') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const tick = readNumberFlag('render-canvas-demo', '--tick', undefined);
    const width = readNumberFlag('render-canvas-demo', '--width', undefined);
    const height = readNumberFlag('render-canvas-demo', '--height', undefined);
    const assetManifestPath = readStringFlag('render-canvas-demo', '--asset-manifest', undefined);
    const requestedOutPath = readStringFlag('render-canvas-demo', '--out', undefined);
    const rawSnapshot = await buildRenderSnapshotV1(maybePath, {
      tick,
      width,
      height,
      assetManifestPath
    });
    const snapshot = materializeBrowserDemoAssetSrcV1(rawSnapshot, assetManifestPath);
    const html = renderCanvas2DDemoHtmlV1({
      title: `${snapshot.scene} Canvas 2D Demo`,
      renderSnapshot: snapshot,
      metadata: {
        scene: snapshot.scene,
        tick: snapshot.tick,
        viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
      }
    });
    const outputPath = requestedOutPath ? path.resolve(requestedOutPath) : undefined;

    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, html, 'utf8');
    }

    const envelope = {
      canvasDemoVersion: CANVAS_2D_DEMO_VERSION,
      scene: snapshot.scene,
      tick: snapshot.tick,
      ...(outputPath ? { outputPath } : {}),
      html
    };

    if (asJson) {
      console.log(JSON.stringify(envelope, null, 2));
    } else if (outputPath) {
      console.log(outputPath);
    } else {
      process.stdout.write(html);
    }

    return;
  }

  if (command === 'render-browser-demo') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const tick = readNumberFlag('render-browser-demo', '--tick', undefined);
    const width = readNumberFlag('render-browser-demo', '--width', undefined);
    const height = readNumberFlag('render-browser-demo', '--height', undefined);
    const assetManifestPath = readStringFlag('render-browser-demo', '--asset-manifest', undefined);
    const atlasMaterialManifestPath = readStringFlag('render-browser-demo', '--atlas-material-manifest', undefined);
    const requestedOutPath = readStringFlag('render-browser-demo', '--out', undefined);
    const movementBlocking = hasFlag('--movement-blocking');
    const gameplayHud = hasFlag('--gameplay-hud');
    const playableSaveLoad = hasFlag('--playable-save-load');
    const audioLite = hasFlag('--audio-lite');
    const spriteAnimation = hasFlag('--sprite-animation');
    const uiSystem = hasFlag('--ui-system');
    const uiInputPreview = hasFlag('--ui-input-preview');
    if (spriteAnimation && atlasMaterialManifestPath !== undefined) {
      throw new Error('render-browser-demo: --sprite-animation cannot be combined with --atlas-material-manifest');
    }
    if (uiInputPreview && !uiSystem) {
      throw new Error('render-browser-demo: --ui-input-preview requires --ui-system');
    }
    const scene = await loadSceneFile(maybePath);
    const atlasInputs = await resolveAtlasMaterialRenderInputsV1(scene, {
      assetManifestPath,
      atlasMaterialManifestPath
    });
    const rawSnapshot = await buildRenderSnapshotV1(atlasInputs.scene, {
      tick,
      width,
      height,
      assetManifestPath: atlasInputs.assetManifestPath
    });
    const snapshot = materializeBrowserDemoAssetSrcV1(rawSnapshot, atlasInputs.assetManifestPath);
    const title = `${snapshot.scene} Browser Playable Demo`;
    const metadata = createBrowserPlayableDemoMetadataV1(atlasInputs.scene, snapshot, {
      movementBlocking,
      gameplayHud,
      playableSaveLoad,
      audioLite,
      spriteAnimation,
      atlasMaterial: atlasInputs.atlasMaterial,
      uiSystem,
      browserUiInputPreview: uiInputPreview
    });
    const html = renderBrowserPlayableDemoHtmlV1({
      title,
      renderSnapshot: snapshot,
      metadata
    });
    const outputPath = requestedOutPath ? path.resolve(requestedOutPath) : undefined;

    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, html, 'utf8');
    }

    const envelope = {
      browserDemoVersion: BROWSER_PLAYABLE_DEMO_VERSION,
      scene: snapshot.scene,
      tick: snapshot.tick,
      ...(outputPath ? { outputPath } : {}),
      html
    };

    if (asJson) {
      console.log(JSON.stringify(envelope, null, 2));
    } else if (outputPath) {
      console.log(outputPath);
    } else {
      process.stdout.write(html);
    }

    return;
  }

  if (command === 'export-html-game') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--out')) {
      throw new Error('export-html-game: --out is required');
    }

    const requestedOutPath = readStringFlag('export-html-game', '--out', undefined);
    const assetManifestPath = readStringFlag('export-html-game', '--asset-manifest', undefined);
    const movementBlocking = hasFlag('--movement-blocking');
    const gameplayHud = hasFlag('--gameplay-hud');
    const playableSaveLoad = hasFlag('--playable-save-load');
    const audioLite = hasFlag('--audio-lite');
    const uiSystem = hasFlag('--ui-system');
    const envelope = await exportHtmlGameV1(maybePath, {
      outputPath: requestedOutPath,
      assetManifestPath,
      movementBlocking,
      gameplayHud,
      playableSaveLoad,
      audioLite,
      uiSystem
    });

    if (asJson) {
      console.log(JSON.stringify(envelope, null, 2));
    } else {
      console.log(envelope.outputPath);
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

  if (command === 'inspect-collision-bounds') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildCollisionBoundsReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Collision bounds report version: ${report.collisionBoundsReportVersion}`);
      console.log(`Bounds: ${report.bounds.length}`);
      for (const bound of report.bounds) {
        console.log(
          `- ${bound.entityId}: ${bound.x},${bound.y} ${bound.width}x${bound.height} solid=${bound.solid}`
        );
      }
    }

    return;
  }

  if (command === 'inspect-collision-overlaps') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildCollisionOverlapReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Collision overlap report version: ${report.collisionOverlapReportVersion}`);
      console.log(`Overlaps: ${report.overlaps.length}`);
      for (const overlap of report.overlaps) {
        console.log(
          `- ${overlap.entityAId} <-> ${overlap.entityBId} solid=${overlap.solid}`
        );
      }
    }

    return;
  }

  if (command === 'inspect-tile-collision') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildTileCollisionReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Tile collision report version: ${report.tileCollisionReportVersion}`);
      console.log(`Tiles: ${report.tiles.length}`);
      for (const tile of report.tiles) {
        console.log(
          `- ${tile.tileId}: ${tile.x},${tile.y} ${tile.width}x${tile.height} palette=${tile.paletteId} solid=${tile.solid}`
        );
      }
    }

    return;
  }

  if (command === 'inspect-pathfinding-grid') {
    const positionalArgs = process.argv.slice(3).filter((arg) => arg !== '--json');
    if (positionalArgs.length === 0) {
      printUsage();
      process.exitCode = 2;
      return;
    }
    if (positionalArgs.length > 1) {
      throw new Error(`inspect-pathfinding-grid: unexpected argument \`${positionalArgs[1]}\``);
    }

    const report = await buildPathfindingGridReportV1(positionalArgs[0]);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Pathfinding grid report version: ${report.pathfindingGridReportVersion}`);
      console.log(`Grids: ${report.grids.length}`);
      console.log(`Blockers: ${report.blockers.length}`);
      for (const grid of report.grids) {
        console.log(
          `- ${grid.layerEntityId}: ${grid.columns}x${grid.rows} cells=${grid.cellCount} blocked=${grid.blockedCellCount} walkable=${grid.walkableCellCount}`
        );
      }
    }

    return;
  }

  if (command === 'inspect-movement-blocking') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--input-intent')) {
      throw new Error('inspect-movement-blocking: --input-intent is required');
    }

    const inputIntentPath = readStringFlag('inspect-movement-blocking', '--input-intent', undefined);
    const inputIntent = await loadValidatedInputIntentV1(inputIntentPath);
    const report = await buildMovementBlockingReportV1(maybePath, { inputIntent });

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Movement blocking report version: ${report.movementBlockingReportVersion}`);
      console.log(`Entity: ${report.entityId}`);
      console.log(`Input intent tick: ${report.inputIntentTick}`);
      console.log(`Attempted move: ${report.attemptedMove.x},${report.attemptedMove.y}`);
      console.log(`From: ${report.from.x},${report.from.y}`);
      console.log(`Candidate: ${report.candidate.x},${report.candidate.y}`);
      console.log(`Final: ${report.final.x},${report.final.y}`);
      console.log(`Blocked: ${report.blocked}`);
      console.log(`Blocking entities: ${report.blockingEntities.length === 0 ? '(none)' : report.blockingEntities.join(', ')}`);
    }

    return;
  }

  if (command === 'inspect-ui-input-step') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--input-intent')) {
      throw new Error('inspect-ui-input-step: --input-intent is required');
    }

    const inputIntentPath = readStringFlag('inspect-ui-input-step', '--input-intent', undefined);
    const inputIntent = await loadValidatedInputIntentV1(inputIntentPath);
    const report = await buildUiInputStepReportV1(maybePath, { inputIntent });

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`UI input step report version: ${report.uiInputStepReportVersion}`);
      console.log(`Scope policy: ${report.scopePolicy}`);
      console.log(`Input intent version: ${report.inputIntentVersion}`);
      console.log(`Input intent tick: ${report.inputIntentTick}`);
      console.log(`Input intent entity: ${report.inputIntentEntityId}`);
      console.log(`Attempted move: ${report.attemptedMove.x},${report.attemptedMove.y}`);
      console.log(`Direction: ${report.direction}`);
      console.log(`Step type: ${report.stepType}`);
      console.log(`Input handled: ${report.inputHandled}`);
      console.log(`Focused screen: ${report.focusedScreenId ?? '(none)'}`);
      console.log(`Focused widget: ${report.focusedWidgetIdBefore ?? '(none)'}`);
      console.log(`Focused action: ${report.focusedActionIdBefore ?? report.activatedActionId ?? '(none)'}`);
      const focusSource = report.focusedActionIdBefore !== null
        ? 'ui.action.semantics'
        : report.focusedWidgetIdBefore !== null
          ? 'ui.navigation.focus'
          : 'none';
      console.log(`Focus source: ${focusSource}`);
      console.log(`Action candidates: ${report.actionCandidates.length}`);
      if (report.activatedActionId !== null) {
        console.log(`Activated action: ${report.activatedActionId}`);
      }
      console.log(`Warnings: ${report.warnings.length}`);
    }

    return;
  }

  if (command === 'inspect-ui-explicit-input-step') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--ui-explicit-input')) {
      throw new Error('inspect-ui-explicit-input-step: --ui-explicit-input is required');
    }

    const uiExplicitInputPath = readStringFlag(
      'inspect-ui-explicit-input-step',
      '--ui-explicit-input',
      undefined
    );
    const uiExplicitInput = await loadValidatedUiExplicitInputV1(uiExplicitInputPath);
    const report = await buildUiExplicitInputStepReportV1(maybePath, { uiExplicitInput });

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`UI explicit input step report version: ${report.uiExplicitInputStepReportVersion}`);
      console.log(`Scope policy: ${report.scopePolicy}`);
      console.log(`UI explicit input version: ${report.uiExplicitInputVersion}`);
      console.log(`UI explicit input tick: ${report.uiExplicitInputTick}`);
      console.log(`Action type: ${report.actionType}`);
      console.log(`Direction: ${report.direction}`);
      console.log(`Step type: ${report.stepType}`);
      console.log(`Input handled: ${report.inputHandled}`);
      console.log(`Focused screen: ${report.focusedScreenId ?? '(none)'}`);
      console.log(`Focused widget: ${report.focusedWidgetIdBefore ?? '(none)'}`);
      console.log(`Focused action: ${report.focusedActionIdBefore ?? report.activatedActionId ?? '(none)'}`);
      const focusSource = report.focusedActionIdBefore !== null
        ? 'ui.action.semantics'
        : report.focusedWidgetIdBefore !== null
          ? 'ui.navigation.focus'
          : 'none';
      console.log(`Focus source: ${focusSource}`);
      console.log(`Action candidates: ${report.actionCandidates.length}`);
      if (report.activatedActionId !== null) {
        console.log(`Activated action: ${report.activatedActionId}`);
      }
      console.log(`Warnings: ${report.warnings.length}`);
    }

    return;
  }

  if (command === 'validate-prefab') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildPrefabValidationReportV1(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Prefab: ${report.absolutePath}`);
      console.log(`Prefab validation report version: ${report.prefabValidationReportVersion}`);
      console.log(`Prefab version: ${report.prefab?.prefabVersion ?? '(missing)'}`);
      console.log(`Name: ${report.prefab?.metadata?.name ?? '(missing)'}`);
      console.log(`Components: ${Array.isArray(report.prefab?.components) ? report.prefab.components.length : '(missing)'}`);
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

  if (command === 'export-portable-html-game') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    if (!hasFlag('--out')) {
      throw new Error('export-portable-html-game: --out is required');
    }

    const requestedOutPath = readStringFlag('export-portable-html-game', '--out', undefined);
    const assetManifestPath = readStringFlag('export-portable-html-game', '--asset-manifest', undefined);
    const atlasMaterialManifestPath = readStringFlag(
      'export-portable-html-game',
      '--atlas-material-manifest',
      undefined
    );
    const movementBlocking = hasFlag('--movement-blocking');
    const gameplayHud = hasFlag('--gameplay-hud');
    const playableSaveLoad = hasFlag('--playable-save-load');
    const audioLite = hasFlag('--audio-lite');
    const spriteAnimation = hasFlag('--sprite-animation');
    const uiSystem = hasFlag('--ui-system');
    const envelope = await exportPortableHtmlGameV2(maybePath, {
      outputPath: requestedOutPath,
      assetManifestPath,
      atlasMaterialManifestPath,
      movementBlocking,
      gameplayHud,
      playableSaveLoad,
      audioLite,
      spriteAnimation,
      uiSystem
    });

    if (asJson) {
      console.log(JSON.stringify(envelope, null, 2));
    } else {
      console.log(envelope.outputPath);
    }

    return;
  }

  if (command === 'inspect-ui-system') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildUiSystemReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`UI system report version: ${report.uiSystemReportVersion}`);
      console.log(`Screens: ${report.screens.length}`);
      for (const screen of report.screens) {
        console.log(
          `- ${screen.screenId}: entity=${screen.entityId} active=${screen.active} layer=${screen.layer} widgets=${screen.widgets.length}`
        );
      }
      console.log(`Warnings: ${report.warnings.length}`);
    }

    return;
  }

  if (command === 'inspect-ui-navigation-focus') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildUiNavigationFocusReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`UI navigation focus report version: ${report.uiNavigationFocusReportVersion}`);
      console.log(`Scope policy: ${report.scopePolicy}`);
      console.log(`Focused screen: ${report.focusedScreenId ?? '(none)'}`);
      console.log(`Initial focus widget: ${report.initialFocusWidgetId ?? '(none)'}`);
      console.log(`Candidates: ${report.candidates.length}`);
      for (const candidate of report.candidates) {
        console.log(
          `- ${candidate.widgetId}: screen=${candidate.screenId} index=${candidate.candidateIndex} previous=${candidate.previousCandidateWidgetId ?? '(none)'} next=${candidate.nextCandidateWidgetId ?? '(none)'}`
        );
      }
      console.log(`Warnings: ${report.warnings.length}`);
    }

    return;
  }

  if (command === 'inspect-ui-action-semantics') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildUiActionSemanticsReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`UI action semantics report version: ${report.uiActionSemanticsReportVersion}`);
      console.log(`Scope policy: ${report.scopePolicy}`);
      console.log(`Focused screen: ${report.focusedScreenId ?? '(none)'}`);
      console.log(`Initial focus widget: ${report.initialFocusWidgetId ?? '(none)'}`);
      console.log(`Actions: ${report.actions.length}`);
      for (const action of report.actions) {
        console.log(
          `- ${action.widgetId}: screen=${action.screenId} action=${action.actionId} index=${action.actionIndex} previous=${action.previousActionWidgetId ?? '(none)'} next=${action.nextActionWidgetId ?? '(none)'}`
        );
      }
      console.log(`Warnings: ${report.warnings.length}`);
    }

    return;
  }

  if (command === 'inspect-ui-local-screen-state') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildUiLocalScreenStateReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`UI local screen state report version: ${report.uiLocalScreenStateReportVersion}`);
      console.log(`Scope policy: ${report.scopePolicy}`);
      console.log(`Focus resolution policy: ${report.focusResolutionPolicy}`);
      console.log(`Focused screen: ${report.focusedScreenId ?? '(none)'}`);
      console.log(`Focused widget: ${report.focusedWidgetId ?? '(none)'}`);
      console.log(`Focus source: ${report.focusSource}`);
      console.log(`Screens: ${report.screens.length}`);
      for (const screen of report.screens) {
        console.log(
          `- ${screen.screenId}: state=${screen.localState} stackIndex=${screen.stackIndex ?? '(none)'} focusSource=${screen.focusSource} focusedWidget=${screen.focusedWidgetId ?? '(none)'}`
        );
      }
      console.log(`Warnings: ${report.warnings.length}`);
    }

    return;
  }


  if (command === 'inspect-sprite-animation') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildSpriteAnimationReportV1(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Sprite Animation report version: ${report.spriteAnimationReportVersion}`);
      console.log(`Scene: ${report.scene ?? '(unknown)'}`);
      console.log(`Animations: ${report.animations.length}`);
      console.log(`Warnings: ${report.warnings.length}`);
      console.log(`Invalid refs: ${report.invalidRefs.length}`);
    }
    return;
  }

  if (command === 'inspect-prefab-usage') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildPrefabUsageReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Prefab usage report version: ${report.prefabUsageReportVersion}`);
      console.log(`Prefab entities: ${report.prefabs.length}`);
      for (const prefab of report.prefabs) {
        const components = prefab.components
          .map((component) => `${component.kind}(${component.source})`)
          .join(', ');
        const overrides = prefab.overriddenComponents.join(', ') || '(none)';
        console.log(`- ${prefab.entityId}: ${prefab.prefab} (${prefab.prefabName})`);
        console.log(`  components: ${components}`);
        console.log(`  overridden: ${overrides}`);
      }
    }

    return;
  }

  if (command === 'inspect-prefab-usage-v2') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildPrefabUsageReportV2(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Path: ${report.absolutePath}`);
      console.log(`Prefab usage report version: ${report.prefabUsageReportVersion}`);
      console.log(`Prefab entities: ${report.prefabs.length}`);
      for (const prefab of report.prefabs) {
        const components = prefab.components
          .map(
            (component) =>
              `${component.kind}(${component.source} ${component.sourceComponentPath} -> ${component.resolvedComponentPath})`
          )
          .join(', ');
        const overrides = prefab.overrides
          .map(
            (override) =>
              `${override.kind}(${override.entityComponentPath} -> ${override.prefabComponentPath} -> ${override.resolvedComponentPath})`
          )
          .join(', ') || '(none)';
        console.log(`- ${prefab.entityId}: ${prefab.prefab} (${prefab.prefabName})`);
        console.log(`  entityPath: ${prefab.entityPath}`);
        console.log(`  prefabAbsolutePath: ${prefab.prefabAbsolutePath}`);
        console.log(`  components: ${components}`);
        console.log(`  overrides: ${overrides}`);
      }
    }

    return;
  }
  if (command === 'inspect-audio-lite') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await buildAudioLiteReportV1(maybePath);

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Scene: ${report.scene}`);
      console.log(`Audio Lite report version: ${report.audioLiteReportVersion}`);
      console.log(`Clips: ${report.clips.length}`);
      for (const clip of report.clips) {
        console.log(
          `- ${clip.clipId}: entity=${clip.entityId} kind=${clip.kind} trigger=${clip.trigger} volume=${clip.volume} loop=${clip.loop} src=${clip.src ?? '(none)'}`
        );
      }
      console.log(`Warnings: ${report.warnings.length}`);
      console.log(`Invalid refs: ${report.invalidRefs.length}`);
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
    const movementBlocking = hasFlag('--movement-blocking');
    const withTrace = hasFlag('--trace');

    if (keyboardScriptPath) {
      const result = await runLoopWithKeyboardInputScriptV1(maybePath, keyboardScriptPath, {
        ticks,
        seed,
        trace: withTrace,
        movementBlocking
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
      const traced = runMinimalSystemLoopWithTrace(scene, {
        ticks,
        seed,
        inputIntent,
        movementBlocking
      });

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

    const loopResult = runMinimalSystemLoop(scene, {
      ticks,
      seed,
      inputIntent,
      movementBlocking
    });

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
