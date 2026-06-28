import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateLoopScene,
  formatSceneValidationReportV1,
  buildAssetManifestValidationReportV1,
  buildAtlasMaterialManifestReportV1,
  validateInputIntentV1,
  buildPrefabValidationReportV1,
  validateSaveFile,
  loadStateSnapshotSaveV1,
  saveStateSnapshotV1,
  validateInputIntentV1File,
  createInputIntentFromKeyboardV1,
  loadValidatedInputIntentV1,
  loadValidatedKeyboardInputScriptV1,
  createKeyboardInputIntentResolverFromScriptV1,
  loadSceneFile,
  createLoopExecutionPlan,
  createInitialStateFromScene,
  simulateStateV1,
  simulateStateV1WithMutationTrace,
  buildWorldSnapshotMessage,
  buildSceneTransitionReportV1,
  buildSceneCompositionManifestReportV1,
  buildRenderSnapshotV1,
  renderSnapshotToSvgV1,
  RENDER_SVG_VERSION,
  buildVisualRegressionBaselineReportV1,
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
  snapshotStateV1,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace,
  buildCollisionBoundsReportV1,
  buildCollisionOverlapReportV1,
  buildMovementBlockingReportV1,
  buildTileCollisionReportV1,
  buildPathfindingGridReportV1,
  buildAudioLiteReportV1,
  buildUiSystemReportV1,
  buildUiNavigationFocusReportV1,
  buildUiActionSemanticsReportV1,
  buildUiLocalScreenStateReportV1,
  buildSpriteAnimationReportV1,
  buildPrefabUsageReportV1,
  buildPrefabUsageReportV2
} from '../../../engine/runtime/src/index.mjs';
import { toolCatalog } from './tool-catalog.mjs';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverDir, '../../..');
const supportedProtocolVersions = ['2025-06-18', '2025-03-26'];

let initialized = false;

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function writeError(id, code, message, data) {
  writeMessage({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  });
}

function writeResult(id, result) {
  writeMessage({
    jsonrpc: '2.0',
    id,
    result
  });
}

function toTextContent(text) {
  return [{ type: 'text', text }];
}

function ensureRequest(message) {
  return message && typeof message === 'object' && message.jsonrpc === '2.0' && typeof message.method === 'string';
}

function resolveRepoPath(inputPath) {
  const absolutePath = path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(repoRoot, inputPath);

  const relativeToRoot = path.relative(repoRoot, absolutePath);
  const escapesRepo =
    relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot);

  if (escapesRepo) {
    const error = new Error('path must stay inside the repository root');
    error.name = 'ToolInputError';
    throw error;
  }

  return absolutePath;
}

function findUnexpectedArgument(args, allowedKeys) {
  return Object.keys(args).find((key) => !allowedKeys.has(key));
}

async function handleToolCall(params) {
  if (!params || typeof params !== 'object') {
    return {
      content: toTextContent('Tool call is missing params.'),
      isError: true
    };
  }

  if (
    params.name !== 'validate_scene' &&
    params.name !== 'validate_asset_manifest' &&
    params.name !== 'inspect_atlas_material_manifest' &&
    params.name !== 'validate_input_intent' &&
    params.name !== 'validate_prefab' &&
    params.name !== 'keyboard_to_input_intent' &&
    params.name !== 'validate_save' &&
    params.name !== 'save_state_snapshot' &&
    params.name !== 'load_save' &&
    params.name !== 'emit_world_snapshot' &&
    params.name !== 'inspect_scene_transition' &&
    params.name !== 'inspect_scene_composition' &&
    params.name !== 'render_snapshot' &&
    params.name !== 'render_svg' &&
    params.name !== 'inspect_visual_regression_baseline' &&
    params.name !== 'render_canvas_demo' &&
    params.name !== 'render_browser_demo' &&
    params.name !== 'export_html_game' &&
    params.name !== 'export_portable_html_game' &&
    params.name !== 'plan_loop' &&
    params.name !== 'run_loop' &&
    params.name !== 'run_replay' &&
    params.name !== 'run_replay_artifact' &&
    params.name !== 'inspect_state' &&
    params.name !== 'inspect_collision_bounds' &&
    params.name !== 'inspect_collision_overlaps' &&
    params.name !== 'inspect_tile_collision' &&
    params.name !== 'inspect_pathfinding_grid' &&
    params.name !== 'inspect_audio_lite' &&
    params.name !== 'inspect_ui_system' &&
    params.name !== 'inspect_ui_navigation_focus' &&
    params.name !== 'inspect_ui_action_semantics' &&
    params.name !== 'inspect_ui_local_screen_state' &&
    params.name !== 'inspect_sprite_animation' &&
    params.name !== 'inspect_prefab_usage' &&
    params.name !== 'inspect_prefab_usage_v2' &&
    params.name !== 'inspect_movement_blocking' &&
    params.name !== 'simulate_state'
  ) {
    throw Object.assign(new Error(`Unknown tool: ${params.name}`), { code: -32602 });
  }

  const args = params.arguments ?? {};
  if (
    params.name !== 'keyboard_to_input_intent' &&
    params.name !== 'export_html_game' &&
    params.name !== 'export_portable_html_game' &&
    params.name !== 'inspect_scene_transition' &&
    (typeof args.path !== 'string' || args.path.trim().length === 0)
  ) {
    return {
      content: toTextContent('The `path` argument is required and must be a non-empty string.'),
      isError: true
    };
  }

  try {
    if (params.name === 'keyboard_to_input_intent') {
      if (!Number.isInteger(args.tick) || args.tick < 1) {
        return {
          content: toTextContent('keyboard_to_input_intent: `tick` is required and must be an integer >= 1.'),
          isError: true
        };
      }

      if (typeof args.entityId !== 'string' || args.entityId.trim().length === 0) {
        return {
          content: toTextContent('keyboard_to_input_intent: `entityId` is required and must be a non-empty string.'),
          isError: true
        };
      }

      if (
        !Array.isArray(args.keys) ||
        args.keys.length === 0 ||
        args.keys.some((key) => typeof key !== 'string' || key.trim().length === 0)
      ) {
        return {
          content: toTextContent(
            'keyboard_to_input_intent: `keys` is required and must be a non-empty array of strings.'
          ),
          isError: true
        };
      }

      const inputIntent = createInputIntentFromKeyboardV1({
        tick: args.tick,
        entityId: args.entityId,
        keys: args.keys
      });
      const report = await validateInputIntentV1(inputIntent);

      if (!report.ok) {
        return {
          content: toTextContent('keyboard_to_input_intent: generated input intent failed validation.'),
          structuredContent: report,
          isError: true
        };
      }

      return {
        content: toTextContent(`Input intent generated for ${inputIntent.entityId} at tick ${inputIntent.tick}.`),
        structuredContent: inputIntent,
        isError: false
      };
    }

    if (params.name === 'export_html_game') {
      const unexpectedArgument = findUnexpectedArgument(
        args,
        new Set([
          'scenePath',
          'outputPath',
          'assetManifestPath',
          'movementBlocking',
          'gameplayHud',
          'playableSaveLoad',
          'audioLite',
          'uiSystem'
        ])
      );
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`export_html_game: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      if (typeof args.scenePath !== 'string' || args.scenePath.trim().length === 0) {
        return {
          content: toTextContent('export_html_game: `scenePath` is required and must be a non-empty string.'),
          isError: true
        };
      }

      if (typeof args.outputPath !== 'string' || args.outputPath.trim().length === 0) {
        return {
          content: toTextContent('export_html_game: `outputPath` is required and must be a non-empty string.'),
          isError: true
        };
      }

      if (args.movementBlocking !== undefined && typeof args.movementBlocking !== 'boolean') {
        return {
          content: toTextContent('export_html_game: `movementBlocking` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.gameplayHud !== undefined && typeof args.gameplayHud !== 'boolean') {
        return {
          content: toTextContent('export_html_game: `gameplayHud` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.playableSaveLoad !== undefined && typeof args.playableSaveLoad !== 'boolean') {
        return {
          content: toTextContent('export_html_game: `playableSaveLoad` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.audioLite !== undefined && typeof args.audioLite !== 'boolean') {
        return {
          content: toTextContent('export_html_game: `audioLite` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.uiSystem !== undefined && typeof args.uiSystem !== 'boolean') {
        return {
          content: toTextContent('export_html_game: `uiSystem` must be a boolean when provided.'),
          isError: true
        };
      }

      if (
        args.assetManifestPath !== undefined &&
        (typeof args.assetManifestPath !== 'string' || args.assetManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent('export_html_game: `assetManifestPath` must be a non-empty string when provided.'),
          isError: true
        };
      }

      const exportEnvelope = await exportHtmlGameV1(resolveRepoPath(args.scenePath), {
        outputPath: resolveRepoPath(args.outputPath),
        assetManifestPath: args.assetManifestPath === undefined
          ? undefined
          : resolveRepoPath(args.assetManifestPath),
        movementBlocking: args.movementBlocking === true,
        gameplayHud: args.gameplayHud === true,
        playableSaveLoad: args.playableSaveLoad === true,
        audioLite: args.audioLite === true,
        uiSystem: args.uiSystem === true
      });

      return {
        content: toTextContent(`HTML game export written for ${exportEnvelope.scene}.`),
        structuredContent: exportEnvelope,
        isError: false
      };
    }

    if (params.name === 'export_portable_html_game') {
      const unexpectedArgument = findUnexpectedArgument(
        args,
        new Set([
          'scenePath',
          'outputPath',
          'assetManifestPath',
          'atlasMaterialManifestPath',
          'movementBlocking',
          'gameplayHud',
          'playableSaveLoad',
          'audioLite',
          'spriteAnimation',
          'uiSystem'
        ])
      );
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`export_portable_html_game: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      if (typeof args.scenePath !== 'string' || args.scenePath.trim().length === 0) {
        return {
          content: toTextContent('export_portable_html_game: `scenePath` is required and must be a non-empty string.'),
          isError: true
        };
      }

      if (typeof args.outputPath !== 'string' || args.outputPath.trim().length === 0) {
        return {
          content: toTextContent('export_portable_html_game: `outputPath` is required and must be a non-empty string.'),
          isError: true
        };
      }

      if (
        args.assetManifestPath !== undefined &&
        (typeof args.assetManifestPath !== 'string' || args.assetManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent(
            'export_portable_html_game: `assetManifestPath` must be a non-empty string when provided.'
          ),
          isError: true
        };
      }

      if (
        args.atlasMaterialManifestPath !== undefined &&
        (typeof args.atlasMaterialManifestPath !== 'string' || args.atlasMaterialManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent(
            'export_portable_html_game: `atlasMaterialManifestPath` must be a non-empty string when provided.'
          ),
          isError: true
        };
      }

      if (args.assetManifestPath !== undefined && args.atlasMaterialManifestPath !== undefined) {
        return {
          content: toTextContent(
            'export_portable_html_game: provide only one of `assetManifestPath` or `atlasMaterialManifestPath`.'
          ),
          isError: true
        };
      }

      if (args.spriteAnimation === true && args.atlasMaterialManifestPath !== undefined) {
        return {
          content: toTextContent(
            'export_portable_html_game: `spriteAnimation` cannot be combined with `atlasMaterialManifestPath` in Portable HTML Export v2.'
          ),
          isError: true
        };
      }

      if (args.movementBlocking !== undefined && typeof args.movementBlocking !== 'boolean') {
        return {
          content: toTextContent('export_portable_html_game: `movementBlocking` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.gameplayHud !== undefined && typeof args.gameplayHud !== 'boolean') {
        return {
          content: toTextContent('export_portable_html_game: `gameplayHud` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.playableSaveLoad !== undefined && typeof args.playableSaveLoad !== 'boolean') {
        return {
          content: toTextContent('export_portable_html_game: `playableSaveLoad` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.audioLite !== undefined && typeof args.audioLite !== 'boolean') {
        return {
          content: toTextContent('export_portable_html_game: `audioLite` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.spriteAnimation !== undefined && typeof args.spriteAnimation !== 'boolean') {
        return {
          content: toTextContent('export_portable_html_game: `spriteAnimation` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.uiSystem !== undefined && typeof args.uiSystem !== 'boolean') {
        return {
          content: toTextContent('export_portable_html_game: `uiSystem` must be a boolean when provided.'),
          isError: true
        };
      }

      const exportEnvelope = await exportPortableHtmlGameV2(resolveRepoPath(args.scenePath), {
        outputPath: resolveRepoPath(args.outputPath),
        assetManifestPath: args.assetManifestPath === undefined
          ? undefined
          : resolveRepoPath(args.assetManifestPath),
        atlasMaterialManifestPath: args.atlasMaterialManifestPath === undefined
          ? undefined
          : resolveRepoPath(args.atlasMaterialManifestPath),
        movementBlocking: args.movementBlocking === true,
        gameplayHud: args.gameplayHud === true,
        playableSaveLoad: args.playableSaveLoad === true,
        audioLite: args.audioLite === true,
        spriteAnimation: args.spriteAnimation === true,
        uiSystem: args.uiSystem === true
      });

      return {
        content: toTextContent(`Portable HTML game export written for ${exportEnvelope.scene}.`),
        structuredContent: exportEnvelope,
        isError: false
      };
    }

    if (params.name === 'inspect_scene_transition') {
      const unexpectedArgument = findUnexpectedArgument(
        args,
        new Set([
          'fromPath',
          'toPath'
        ])
      );
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`inspect_scene_transition: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      if (typeof args.fromPath !== 'string' || args.fromPath.trim().length === 0) {
        return {
          content: toTextContent('inspect_scene_transition: `fromPath` is required and must be a non-empty string.'),
          isError: true
        };
      }

      if (typeof args.toPath !== 'string' || args.toPath.trim().length === 0) {
        return {
          content: toTextContent('inspect_scene_transition: `toPath` is required and must be a non-empty string.'),
          isError: true
        };
      }

      const report = await buildSceneTransitionReportV1({
        fromPath: resolveRepoPath(args.fromPath),
        toPath: resolveRepoPath(args.toPath)
      });

      return {
        content: toTextContent(
          report.ok
            ? `Scene transition inspected from ${report.from.scene} to ${report.to.scene}.`
            : 'Scene transition inspection failed validation.'
        ),
        structuredContent: report,
        isError: !report.ok
      };
    }

    if (params.name === 'inspect_scene_composition') {
      const unexpectedArgument = findUnexpectedArgument(args, new Set(['path']));
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`inspect_scene_composition: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      const report = await buildSceneCompositionManifestReportV1(resolveRepoPath(args.path));

      return {
        content: toTextContent(
          report.ok
            ? `Scene composition inspected for ${report.entryScene} with ${report.scenes.length} scene(s).`
            : 'Scene composition inspection failed validation.'
        ),
        structuredContent: report,
        isError: !report.ok
      };
    }

    if (params.name === 'inspect_atlas_material_manifest') {
      const unexpectedArgument = findUnexpectedArgument(args, new Set(['path']));
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`inspect_atlas_material_manifest: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      const report = await buildAtlasMaterialManifestReportV1(resolveRepoPath(args.path));

      return {
        content: toTextContent(
          report.ok
            ? `Atlas/material manifest inspected with ${report.summary.regionCount} region(s).`
            : 'Atlas/material manifest inspection failed validation.'
        ),
        structuredContent: report,
        isError: !report.ok
      };
    }

    const targetPath = resolveRepoPath(args.path);

    if (params.name === 'load_save') {
      const loaded = await loadStateSnapshotSaveV1(targetPath);
      return {
        content: toTextContent(`Loaded save for ${loaded.snapshot.scene} at tick ${loaded.snapshot.tick}.`),
        structuredContent: {
          savePath: loaded.savePath,
          payloadPath: loaded.payloadPath,
          save: loaded.envelope,
          snapshot: loaded.snapshot
        },
        isError: false
      };
    }

    if (params.name === 'save_state_snapshot') {
      if (!Number.isInteger(args.ticks) || args.ticks < 0) {
        return {
          content: toTextContent('save_state_snapshot: `ticks` is required and must be an integer >= 0.'),
          isError: true
        };
      }

      if (args.seed !== undefined && !Number.isInteger(args.seed)) {
        return {
          content: toTextContent('save_state_snapshot: `seed` must be an integer when provided.'),
          isError: true
        };
      }

      if (typeof args.outDir !== 'string' || args.outDir.trim().length === 0) {
        return {
          content: toTextContent('save_state_snapshot: `outDir` is required and must be a non-empty string.'),
          isError: true
        };
      }

      const resolvedOutDir = resolveRepoPath(args.outDir);
      const simulation = await simulateStateV1(targetPath, {
        ticks: args.ticks,
        seed: args.seed
      });
      const saved = await saveStateSnapshotV1({
        snapshot: simulation.finalSnapshot,
        outDir: resolvedOutDir,
        seed: simulation.seed,
        contentVersion: 1
      });

      return {
        content: toTextContent(`Saved state snapshot for ${simulation.scene} at tick ${simulation.ticks}.`),
        structuredContent: {
          savePath: saved.savePath,
          payloadPath: saved.payloadPath,
          save: saved.envelope
        },
        isError: false
      };
    }

    if (
      params.name === 'plan_loop' ||
      params.name === 'run_loop' ||
      params.name === 'run_replay' ||
      params.name === 'run_replay_artifact'
    ) {
      if (!Number.isInteger(args.ticks) || args.ticks < 0) {
        const toolName = params.name;
        return {
          content: toTextContent(`${toolName}: \`ticks\` is required and must be an integer >= 0.`),
          isError: true
        };
      }

      if (args.seed !== undefined && !Number.isInteger(args.seed)) {
        const toolName = params.name;
        return {
          content: toTextContent(`${toolName}: \`seed\` must be an integer when provided.`),
          isError: true
        };
      }

      if (params.name === 'run_loop' && args.trace !== undefined && typeof args.trace !== 'boolean') {
        return {
          content: toTextContent('run_loop: `trace` must be a boolean when provided.'),
          isError: true
        };
      }

      if (params.name === 'run_loop' && args.movementBlocking !== undefined && typeof args.movementBlocking !== 'boolean') {
        return {
          content: toTextContent('run_loop: `movementBlocking` must be a boolean when provided.'),
          isError: true
        };
      }

      if (
        params.name === 'run_loop' &&
        args.inputIntentPath !== undefined &&
        (typeof args.inputIntentPath !== 'string' || args.inputIntentPath.trim().length === 0)
      ) {
        return {
          content: toTextContent('run_loop: `inputIntentPath` must be a non-empty string when provided.'),
          isError: true
        };
      }

      if (
        params.name === 'run_loop' &&
        args.keyboardScriptPath !== undefined &&
        (typeof args.keyboardScriptPath !== 'string' || args.keyboardScriptPath.trim().length === 0)
      ) {
        return {
          content: toTextContent('run_loop: `keyboardScriptPath` must be a non-empty string when provided.'),
          isError: true
        };
      }

      if (params.name === 'plan_loop') {
        const plan = await createLoopExecutionPlan(targetPath, {
          ticks: args.ticks,
          seed: args.seed
        });
        return {
          content: toTextContent(`Execution plan built for ${plan.scene} at tick ${plan.ticks}.`),
          structuredContent: plan,
          isError: !plan.valid
        };
      }

      const scene = await loadSceneFile(targetPath);

      if (params.name === 'run_loop') {
        const inputIntentPath = args.inputIntentPath === undefined
          ? undefined
          : resolveRepoPath(args.inputIntentPath);
        const inputIntent = inputIntentPath === undefined
          ? undefined
          : await loadValidatedInputIntentV1(inputIntentPath);
        const keyboardScriptPath = args.keyboardScriptPath === undefined
          ? undefined
          : resolveRepoPath(args.keyboardScriptPath);
        const keyboardInputScript = keyboardScriptPath === undefined
          ? undefined
          : await loadValidatedKeyboardInputScriptV1(keyboardScriptPath);
        const inputIntentResolver = keyboardInputScript === undefined
          ? undefined
          : createKeyboardInputIntentResolverFromScriptV1(keyboardInputScript);
        const movementBlocking = args.movementBlocking === true;

        if (args.trace === true) {
          const traced = runMinimalSystemLoopWithTrace(scene, {
            ticks: args.ticks,
            seed: args.seed,
            inputIntent,
            inputIntentResolver,
            movementBlocking
          });
          return {
            content: toTextContent(`Loop trace completed for ${traced.report.scene} at tick ${traced.report.ticks}.`),
            structuredContent: traced,
            isError: false
          };
        }

        const loopResult = runMinimalSystemLoop(scene, {
          ticks: args.ticks,
          seed: args.seed,
          inputIntent,
          inputIntentResolver,
          movementBlocking
        });
        const loopReport = {
          loopReportVersion: 1,
          scene: scene.metadata.name,
          ticks: args.ticks,
          seed: args.seed ?? 1337,
          ticksExecuted: loopResult.ticksExecuted,
          finalState: loopResult.finalState,
          executedSystems: loopResult.executedSystems
        };
        return {
          content: toTextContent(`Loop completed for ${loopReport.scene} at tick ${loopReport.ticks}.`),
          structuredContent: loopReport,
          isError: false
        };
      }

      const replay = runDeterministicReplay(scene, {
        ticks: args.ticks,
        seed: args.seed
      });

      if (params.name === 'run_replay_artifact') {
        const artifact = buildReplayArtifact(scene.metadata.name, replay);
        return {
          content: toTextContent(`Replay artifact built for ${artifact.scene} at tick ${artifact.ticks}.`),
          structuredContent: artifact,
          isError: false
        };
      }

      const replayMetrics = {
        ciPayloadVersion: 1,
        scene: scene.metadata.name,
        ticks: replay.ticks,
        seed: replay.seed,
        replaySignature: replay.replaySignature,
        snapshotOpcode: replay.snapshot.opcode
      };
      return {
        content: toTextContent(`Replay completed with ${replayMetrics.snapshotOpcode} at tick ${replayMetrics.ticks}.`),
        structuredContent: replayMetrics,
        isError: false
      };
    }

    if (params.name === 'inspect_state') {
      if (args.seed !== undefined && !Number.isInteger(args.seed)) {
        return {
          content: toTextContent('inspect_state: `seed` must be an integer when provided.'),
          isError: true
        };
      }

      const state = await createInitialStateFromScene(targetPath, { seed: args.seed });
      const snapshot = snapshotStateV1(state);
      return {
        content: toTextContent(`State snapshot built for ${snapshot.scene} with ${snapshot.entities.length} entities.`),
        structuredContent: snapshot,
        isError: false
      };
    }

    if (params.name === 'inspect_collision_bounds') {
      const report = await buildCollisionBoundsReportV1(targetPath);
      return {
        content: toTextContent(`Collision bounds report built for ${report.scene} with ${report.bounds.length} bound(s).`),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_collision_overlaps') {
      const report = await buildCollisionOverlapReportV1(targetPath);
      return {
        content: toTextContent(
          `Collision overlap report built for ${report.scene} with ${report.overlaps.length} overlap(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_tile_collision') {
      const report = await buildTileCollisionReportV1(targetPath);
      return {
        content: toTextContent(
          `Tile collision report built for ${report.scene} with ${report.tiles.length} solid tile(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_pathfinding_grid') {
      const unexpectedArgument = findUnexpectedArgument(args, new Set(['path']));
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`inspect_pathfinding_grid: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      const report = await buildPathfindingGridReportV1(targetPath);
      return {
        content: toTextContent(
          `Pathfinding grid report built for ${report.scene} with ${report.grids.length} grid(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_ui_system') {
      const report = await buildUiSystemReportV1(targetPath);
      return {
        content: toTextContent(
          `UI system report built for ${report.scene} with ${report.screens.length} screen(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_ui_navigation_focus') {
      const unexpectedArgument = findUnexpectedArgument(args, new Set(['path']));
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`inspect_ui_navigation_focus: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      const report = await buildUiNavigationFocusReportV1(targetPath);
      return {
        content: toTextContent(
          `UI navigation focus report built for ${report.scene} with ${report.candidates.length} candidate(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_ui_action_semantics') {
      const unexpectedArgument = findUnexpectedArgument(args, new Set(['path']));
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`inspect_ui_action_semantics: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      const report = await buildUiActionSemanticsReportV1(targetPath);
      return {
        content: toTextContent(
          `UI action semantics report built for ${report.scene} with ${report.actions.length} action(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_ui_local_screen_state') {
      const unexpectedArgument = findUnexpectedArgument(args, new Set(['path']));
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`inspect_ui_local_screen_state: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      const report = await buildUiLocalScreenStateReportV1(targetPath);
      const activeScreenCount = report.screens.filter((screen) => screen.inActiveStack).length;
      return {
        content: toTextContent(
          `UI local screen state report built for ${report.scene} with ${activeScreenCount} active screen(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_sprite_animation') {
      const report = await buildSpriteAnimationReportV1(resolveRepoPath(args.path));
      return { content: toTextContent('Sprite Animation report generated.'), structuredContent: report, isError: false };
    }

    if (params.name === 'inspect_prefab_usage') {
      const report = await buildPrefabUsageReportV1(targetPath);
      return {
        content: toTextContent(`Prefab usage report built for ${report.scene} with ${report.prefabs.length} prefab entity(ies).`),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_prefab_usage_v2') {
      const report = await buildPrefabUsageReportV2(targetPath);
      return {
        content: toTextContent(`Prefab usage report v2 built for ${report.scene} with ${report.prefabs.length} prefab entity(ies).`),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_audio_lite') {
      const report = await buildAudioLiteReportV1(targetPath);
      return {
        content: toTextContent(
          `Audio Lite report built for ${report.scene} with ${report.clips.length} clip(s).`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'inspect_movement_blocking') {
      if (
        typeof args.inputIntentPath !== 'string' ||
        args.inputIntentPath.trim().length === 0
      ) {
        return {
          content: toTextContent('inspect_movement_blocking: `inputIntentPath` is required and must be a non-empty string.'),
          isError: true
        };
      }

      const inputIntent = await loadValidatedInputIntentV1(resolveRepoPath(args.inputIntentPath));
      const report = await buildMovementBlockingReportV1(targetPath, { inputIntent });
      return {
        content: toTextContent(
          `Movement blocking inspected for ${report.entityId}: blocked=${report.blocked}.`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'simulate_state') {
      if (!Number.isInteger(args.ticks) || args.ticks < 0) {
        return {
          content: toTextContent('simulate_state: `ticks` is required and must be an integer >= 0.'),
          isError: true
        };
      }

      if (args.seed !== undefined && !Number.isInteger(args.seed)) {
        return {
          content: toTextContent('simulate_state: `seed` must be an integer when provided.'),
          isError: true
        };
      }

      if (args.trace !== undefined && typeof args.trace !== 'boolean') {
        return {
          content: toTextContent('simulate_state: `trace` must be a boolean when provided.'),
          isError: true
        };
      }

      if (
        args.processors !== undefined &&
        (!Array.isArray(args.processors) || args.processors.some((name) => typeof name !== 'string'))
      ) {
        return {
          content: toTextContent('simulate_state: `processors` must be an array of strings when provided.'),
          isError: true
        };
      }

      const withTrace = args.trace === true;
      const simulationInput = {
        ticks: args.ticks,
        seed: args.seed,
        processors: args.processors
      };
      const structuredContent = withTrace
        ? await simulateStateV1WithMutationTrace(targetPath, simulationInput)
        : await simulateStateV1(targetPath, simulationInput);
      const report = withTrace ? structuredContent.report : structuredContent;

      return {
        content: toTextContent(`State simulation completed for ${report.scene} at tick ${report.ticks}.`),
        structuredContent,
        isError: false
      };
    }

    if (params.name === 'emit_world_snapshot') {
      const scene = await loadSceneFile(targetPath);
      const snapshot = buildWorldSnapshotMessage(scene);
      return {
        content: toTextContent(`Emitted ${snapshot.opcode} for ${snapshot.payload.entities.length} entity(ies).`),
        structuredContent: {
          path: targetPath,
          snapshot
        },
        isError: false
      };
    }

    if (params.name === 'render_snapshot') {
      if (args.tick !== undefined && (!Number.isInteger(args.tick) || args.tick < 0)) {
        return {
          content: toTextContent('render_snapshot: `tick` must be an integer >= 0 when provided.'),
          isError: true
        };
      }

      if (args.width !== undefined && (!Number.isInteger(args.width) || args.width < 1)) {
        return {
          content: toTextContent('render_snapshot: `width` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (args.height !== undefined && (!Number.isInteger(args.height) || args.height < 1)) {
        return {
          content: toTextContent('render_snapshot: `height` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (
        args.assetManifestPath !== undefined &&
        (typeof args.assetManifestPath !== 'string' || args.assetManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent('render_snapshot: `assetManifestPath` must be a non-empty string when provided.'),
          isError: true
        };
      }

      const snapshot = await buildRenderSnapshotV1(targetPath, {
        tick: args.tick,
        width: args.width,
        height: args.height,
        assetManifestPath: args.assetManifestPath === undefined
          ? undefined
          : resolveRepoPath(args.assetManifestPath)
      });
      return {
        content: toTextContent(`Render snapshot built for ${snapshot.scene} at tick ${snapshot.tick}.`),
        structuredContent: snapshot,
        isError: false
      };
    }

    if (params.name === 'render_svg') {
      if (args.tick !== undefined && (!Number.isInteger(args.tick) || args.tick < 0)) {
        return {
          content: toTextContent('render_svg: `tick` must be an integer >= 0 when provided.'),
          isError: true
        };
      }

      if (args.width !== undefined && (!Number.isInteger(args.width) || args.width < 1)) {
        return {
          content: toTextContent('render_svg: `width` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (args.height !== undefined && (!Number.isInteger(args.height) || args.height < 1)) {
        return {
          content: toTextContent('render_svg: `height` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (
        args.assetManifestPath !== undefined &&
        (typeof args.assetManifestPath !== 'string' || args.assetManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent('render_svg: `assetManifestPath` must be a non-empty string when provided.'),
          isError: true
        };
      }

      const snapshot = await buildRenderSnapshotV1(targetPath, {
        tick: args.tick,
        width: args.width,
        height: args.height,
        assetManifestPath: args.assetManifestPath === undefined
          ? undefined
          : resolveRepoPath(args.assetManifestPath)
      });
      const svg = renderSnapshotToSvgV1(snapshot);

      return {
        content: toTextContent(`Render SVG built for ${snapshot.scene} at tick ${snapshot.tick}.`),
        structuredContent: {
          svgVersion: RENDER_SVG_VERSION,
          scene: snapshot.scene,
          tick: snapshot.tick,
          svg
        },
        isError: false
      };
    }

    if (params.name === 'inspect_visual_regression_baseline') {
      if (args.tick !== undefined && (!Number.isInteger(args.tick) || args.tick < 0)) {
        return {
          content: toTextContent('inspect_visual_regression_baseline: `tick` must be an integer >= 0 when provided.'),
          isError: true
        };
      }

      if (args.width !== undefined && (!Number.isInteger(args.width) || args.width < 1)) {
        return {
          content: toTextContent('inspect_visual_regression_baseline: `width` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (args.height !== undefined && (!Number.isInteger(args.height) || args.height < 1)) {
        return {
          content: toTextContent('inspect_visual_regression_baseline: `height` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (
        args.assetManifestPath !== undefined &&
        (typeof args.assetManifestPath !== 'string' || args.assetManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent('inspect_visual_regression_baseline: `assetManifestPath` must be a non-empty string when provided.'),
          isError: true
        };
      }

      const report = await buildVisualRegressionBaselineReportV1(targetPath, {
        tick: args.tick,
        width: args.width,
        height: args.height,
        assetManifestPath: args.assetManifestPath === undefined
          ? undefined
          : resolveRepoPath(args.assetManifestPath)
      });

      return {
        content: toTextContent(
          `Visual regression baseline report built for ${report.scene} at tick ${report.tick}.`
        ),
        structuredContent: report,
        isError: false
      };
    }

    if (params.name === 'render_canvas_demo') {
      if (args.tick !== undefined && (!Number.isInteger(args.tick) || args.tick < 0)) {
        return {
          content: toTextContent('render_canvas_demo: `tick` must be an integer >= 0 when provided.'),
          isError: true
        };
      }

      if (args.width !== undefined && (!Number.isInteger(args.width) || args.width < 1)) {
        return {
          content: toTextContent('render_canvas_demo: `width` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (args.height !== undefined && (!Number.isInteger(args.height) || args.height < 1)) {
        return {
          content: toTextContent('render_canvas_demo: `height` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (
        args.assetManifestPath !== undefined &&
        (typeof args.assetManifestPath !== 'string' || args.assetManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent(
            'render_canvas_demo: `assetManifestPath` must be a non-empty string when provided.'
          ),
          isError: true
        };
      }

      const resolvedAssetManifestPath = args.assetManifestPath === undefined
        ? undefined
        : resolveRepoPath(args.assetManifestPath);
      const rawSnapshot = await buildRenderSnapshotV1(targetPath, {
        tick: args.tick,
        width: args.width,
        height: args.height,
        assetManifestPath: resolvedAssetManifestPath
      });
      const snapshot = materializeBrowserDemoAssetSrcV1(rawSnapshot, resolvedAssetManifestPath);
      const html = renderCanvas2DDemoHtmlV1({
        title: `${snapshot.scene} Canvas 2D Demo`,
        renderSnapshot: snapshot,
        metadata: {
          scene: snapshot.scene,
          tick: snapshot.tick,
          viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
        }
      });

      return {
        content: toTextContent(`Canvas 2D demo built for ${snapshot.scene} at tick ${snapshot.tick}.`),
        structuredContent: {
          canvasDemoVersion: CANVAS_2D_DEMO_VERSION,
          scene: snapshot.scene,
          tick: snapshot.tick,
          html
        },
        isError: false
      };
    }

    if (params.name === 'render_browser_demo') {
      const unexpectedArgument = findUnexpectedArgument(
        args,
        new Set([
          'path',
          'tick',
          'width',
          'height',
          'assetManifestPath',
          'atlasMaterialManifestPath',
          'movementBlocking',
          'gameplayHud',
          'playableSaveLoad',
          'audioLite',
          'spriteAnimation',
          'uiSystem'
        ])
      );
      if (unexpectedArgument !== undefined) {
        return {
          content: toTextContent(`render_browser_demo: unexpected argument \`${unexpectedArgument}\`.`),
          isError: true
        };
      }

      if (args.tick !== undefined && (!Number.isInteger(args.tick) || args.tick < 0)) {
        return {
          content: toTextContent('render_browser_demo: `tick` must be an integer >= 0 when provided.'),
          isError: true
        };
      }

      if (args.width !== undefined && (!Number.isInteger(args.width) || args.width < 1)) {
        return {
          content: toTextContent('render_browser_demo: `width` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (args.height !== undefined && (!Number.isInteger(args.height) || args.height < 1)) {
        return {
          content: toTextContent('render_browser_demo: `height` must be an integer >= 1 when provided.'),
          isError: true
        };
      }

      if (
        args.assetManifestPath !== undefined &&
        (typeof args.assetManifestPath !== 'string' || args.assetManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent(
            'render_browser_demo: `assetManifestPath` must be a non-empty string when provided.'
          ),
          isError: true
        };
      }

      if (args.movementBlocking !== undefined && typeof args.movementBlocking !== 'boolean') {
        return {
          content: toTextContent('render_browser_demo: `movementBlocking` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.gameplayHud !== undefined && typeof args.gameplayHud !== 'boolean') {
        return {
          content: toTextContent('render_browser_demo: `gameplayHud` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.playableSaveLoad !== undefined && typeof args.playableSaveLoad !== 'boolean') {
        return {
          content: toTextContent('render_browser_demo: `playableSaveLoad` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.audioLite !== undefined && typeof args.audioLite !== 'boolean') {
        return {
          content: toTextContent('render_browser_demo: `audioLite` must be a boolean when provided.'),
          isError: true
        };
      }

      if (
        args.atlasMaterialManifestPath !== undefined &&
        (typeof args.atlasMaterialManifestPath !== 'string' || args.atlasMaterialManifestPath.trim().length === 0)
      ) {
        return {
          content: toTextContent(
            'render_browser_demo: `atlasMaterialManifestPath` must be a non-empty string when provided.'
          ),
          isError: true
        };
      }

      if (args.assetManifestPath !== undefined && args.atlasMaterialManifestPath !== undefined) {
        return {
          content: toTextContent(
            'render_browser_demo: provide only one of `assetManifestPath` or `atlasMaterialManifestPath`.'
          ),
          isError: true
        };
      }

      if (args.spriteAnimation !== undefined && typeof args.spriteAnimation !== 'boolean') {
        return {
          content: toTextContent('render_browser_demo: `spriteAnimation` must be a boolean when provided.'),
          isError: true
        };
      }

      if (args.spriteAnimation === true && args.atlasMaterialManifestPath !== undefined) {
        return {
          content: toTextContent(
            'render_browser_demo: `spriteAnimation` cannot be combined with `atlasMaterialManifestPath` in Browser Playable Demo v1.'
          ),
          isError: true
        };
      }

      if (args.uiSystem !== undefined && typeof args.uiSystem !== 'boolean') {
        return {
          content: toTextContent('render_browser_demo: `uiSystem` must be a boolean when provided.'),
          isError: true
        };
      }

      const scene = await loadSceneFile(targetPath);
      const resolvedAssetManifestPath = args.assetManifestPath === undefined
        ? undefined
        : resolveRepoPath(args.assetManifestPath);
      const resolvedAtlasMaterialManifestPath = args.atlasMaterialManifestPath === undefined
        ? undefined
        : resolveRepoPath(args.atlasMaterialManifestPath);
      const atlasInputs = await resolveAtlasMaterialRenderInputsV1(scene, {
        assetManifestPath: resolvedAssetManifestPath,
        atlasMaterialManifestPath: resolvedAtlasMaterialManifestPath
      });
      const rawSnapshot = await buildRenderSnapshotV1(atlasInputs.scene, {
        tick: args.tick,
        width: args.width,
        height: args.height,
        assetManifestPath: atlasInputs.assetManifestPath
      });
      const snapshot = materializeBrowserDemoAssetSrcV1(rawSnapshot, atlasInputs.assetManifestPath);
      const title = `${snapshot.scene} Browser Playable Demo`;
      const metadata = createBrowserPlayableDemoMetadataV1(atlasInputs.scene, snapshot, {
        movementBlocking: args.movementBlocking === true,
        gameplayHud: args.gameplayHud === true,
        playableSaveLoad: args.playableSaveLoad === true,
        audioLite: args.audioLite === true,
        spriteAnimation: args.spriteAnimation === true,
        atlasMaterial: atlasInputs.atlasMaterial,
        uiSystem: args.uiSystem === true
      });
      const html = renderBrowserPlayableDemoHtmlV1({
        title,
        renderSnapshot: snapshot,
        metadata
      });

      return {
        content: toTextContent(`Browser playable demo built for ${snapshot.scene} at tick ${snapshot.tick}.`),
        structuredContent: {
          browserDemoVersion: BROWSER_PLAYABLE_DEMO_VERSION,
          scene: snapshot.scene,
          tick: snapshot.tick,
          html
        },
        isError: false
      };
    }

    if (params.name === 'validate_save') {
      const report = await validateSaveFile(targetPath);
      return {
        content: toTextContent(report.ok ? 'Save validation passed.' : 'Save validation failed.'),
        structuredContent: report,
        isError: !report.ok
      };
    }

    if (params.name === 'validate_asset_manifest') {
      const report = await buildAssetManifestValidationReportV1(targetPath);
      return {
        content: toTextContent(report.ok ? 'Asset manifest validation passed.' : 'Asset manifest validation failed.'),
        structuredContent: report,
        isError: !report.ok
      };
    }

    if (params.name === 'validate_prefab') {
      const report = await buildPrefabValidationReportV1(targetPath);
      return {
        content: toTextContent(report.ok ? 'Prefab validation passed.' : 'Prefab validation failed.'),
        structuredContent: report,
        isError: !report.ok
      };
    }

    if (params.name === 'validate_input_intent') {
      const report = await validateInputIntentV1File(targetPath);
      return {
        content: toTextContent(report.ok ? 'Input intent validation passed.' : 'Input intent validation failed.'),
        structuredContent: report,
        isError: !report.ok
      };
    }

    const report = await validateLoopScene(targetPath);
    return {
      content: toTextContent(formatSceneValidationReportV1(report)),
      structuredContent: report,
      isError: !report.valid
    };
  } catch (error) {
    const errorMessage = params.name === 'run_replay' && error.name === 'ToolInputError'
      ? `run_replay: ${error.message}`
      : error.message;
    return {
      content: toTextContent(errorMessage),
      structuredContent: {
        ok: false,
        errorName: error.name,
        errorMessage
      },
      isError: true
    };
  }
}

async function handleRequest(message) {
  const { id, method, params } = message;

  if (method === 'initialize') {
    const requestedVersion = params?.protocolVersion;
    const protocolVersion = supportedProtocolVersions.includes(requestedVersion)
      ? requestedVersion
      : supportedProtocolVersions[0];

    writeResult(id, {
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: 'ai-engine-tools',
        version: '0.2.0'
      },
      instructions:
        'Use validate_scene, validate_asset_manifest, inspect_atlas_material_manifest, validate_input_intent, validate_prefab, keyboard_to_input_intent, validate_save, save_state_snapshot, load_save, emit_world_snapshot, inspect_scene_transition, inspect_scene_composition, render_snapshot, render_svg, inspect_visual_regression_baseline, render_canvas_demo, render_browser_demo, export_html_game, export_portable_html_game, inspect_collision_bounds, inspect_collision_overlaps, inspect_tile_collision, inspect_pathfinding_grid, inspect_prefab_usage, inspect_prefab_usage_v2, inspect_audio_lite, inspect_ui_system, inspect_ui_navigation_focus, inspect_ui_action_semantics, inspect_sprite_animation, inspect_movement_blocking, run_loop, run_replay and run_replay_artifact for deterministic validation workflows.'
    });
    return;
  }

  if (method === 'notifications/initialized') {
    initialized = true;
    return;
  }

  if (method === 'ping') {
    writeResult(id, {});
    return;
  }

  if (!initialized && (method === 'tools/list' || method === 'tools/call')) {
    writeError(id, -32002, 'Server not initialized. Send notifications/initialized first.');
    return;
  }

  if (method === 'tools/list') {
    writeResult(id, { tools: toolCatalog });
    return;
  }

  if (method === 'tools/call') {
    try {
      const result = await handleToolCall(params);
      writeResult(id, result);
    } catch (error) {
      writeError(id, error.code ?? -32603, error.message);
    }
    return;
  }

  writeError(id, -32601, `Method not found: ${method}`);
}

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity
});

rl.on('line', async (line) => {
  if (!line.trim()) {
    return;
  }

  try {
    const message = JSON.parse(line);
    if (!ensureRequest(message)) {
      if (message?.id !== undefined) {
        writeError(message.id, -32600, 'Invalid JSON-RPC request.');
      }
      return;
    }

    await handleRequest(message);
  } catch (error) {
    writeError(null, -32700, `Parse error: ${error.message}`);
  }
});

process.stderr.write('[ai-engine-tools] MCP server started\n');
