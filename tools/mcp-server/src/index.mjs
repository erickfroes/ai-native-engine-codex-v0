import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateSceneFile,
  formatValidationReport,
  loadSceneFile,
  validatePrefabFile,
  formatPrefabValidationReport,
  runFirstSystemLoop,
  formatFirstSystemLoopReport,
  benchmarkFirstSystemLoop,
  formatFirstLoopBenchmarkReport,
  replayFirstSystemLoop,
  formatReplayFirstLoopReport,
  verifyReplayDeterminism,
  formatReplayDeterminismReport,
  playbackFirstLoopReplayArtifact,
  formatReplayArtifactPlaybackReport,
  validateSceneAssetRefs,
  formatSceneAssetValidationReport,
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

function describeScene(scene) {
  return {
    name: scene.metadata.name,
    systems: scene.systems ?? [],
    entities: (scene.entities ?? []).map((entity) => ({
      id: entity.id,
      name: entity.name ?? null,
      prefab: entity.prefab ?? null,
      components: (entity.components ?? []).map((component) => component.kind)
    }))
  };
}

async function handleToolCall(params) {
  if (!params || typeof params !== 'object') {
    return {
      content: toTextContent('Tool call is missing params.'),
      isError: true
    };
  }

  if (params.name !== 'validate_scene' && params.name !== 'describe_scene' && params.name !== 'validate_prefab' && params.name !== 'simulate_first_loop' && params.name !== 'benchmark_first_loop' && params.name !== 'replay_first_loop' && params.name !== 'verify_replay_determinism' && params.name !== 'playback_replay_artifact' && params.name !== 'validate_scene_assets' && params.name !== 'validate_save' && params.name !== 'validate_input' && params.name !== 'inspect_world' && params.name !== 'inspect_scene_hierarchy' && params.name !== 'validate_ui' && params.name !== 'validate_render' && params.name !== 'validate_network' && params.name !== 'diff_network_snapshots' && params.name !== 'validate_network_sequence' && params.name !== 'simulate_network_replication') {
    throw Object.assign(new Error(`Unknown tool: ${params.name}`), { code: -32602 });
  }

  const args = params.arguments ?? {};

  if (params.name === 'diff_network_snapshots' || params.name === 'validate_network_sequence') {
    if (typeof args.beforePath !== 'string' || args.beforePath.trim().length === 0 || typeof args.afterPath !== 'string' || args.afterPath.trim().length === 0) {
      return {
        content: toTextContent('The `beforePath` and `afterPath` arguments are required for snapshot pair tools.'),
        isError: true
      };
    }
  } else if (params.name === 'simulate_network_replication') {
    if (!Array.isArray(args.paths) || args.paths.length < 2 || args.paths.some((value) => typeof value !== 'string' || value.trim().length === 0)) {
      return {
        content: toTextContent('The `paths` argument is required for simulate_network_replication and must contain at least two paths.'),
        isError: true
      };
    }
  } else if (params.name === 'playback_replay_artifact') {
    if (typeof args.replayPath !== 'string' || args.replayPath.trim().length === 0) {
      return {
        content: toTextContent('The `replayPath` argument is required for playback_replay_artifact.'),
        isError: true
      };
    }
  } else if (typeof args.path !== 'string' || args.path.trim().length === 0) {
    return {
      content: toTextContent('The `path` argument is required and must be a non-empty string.'),
      isError: true
    };
  }


  if (params.name === 'validate_scene_assets') {
    if (typeof args.manifestPath !== 'string' || args.manifestPath.trim().length === 0) {
      return {
        content: toTextContent('The `manifestPath` argument is required for validate_scene_assets.'),
        isError: true
      };
    }
  }

  try {
    if (params.name === 'diff_network_snapshots') {
      const beforePath = resolveRepoPath(args.beforePath);
      const afterPath = resolveRepoPath(args.afterPath);
      const report = await diffNetworkSnapshotFiles(beforePath, afterPath);
      return {
        content: toTextContent(formatNetworkSnapshotDiffReport(report)),
        structuredContent: {
          ok: report.ok,
          beforePath: report.beforePath,
          afterPath: report.afterPath,
          diff: report.diff,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    if (params.name === 'validate_network_sequence') {
      const beforePath = resolveRepoPath(args.beforePath);
      const afterPath = resolveRepoPath(args.afterPath);
      const report = await validateNetworkSnapshotSequence(beforePath, afterPath);
      return {
        content: toTextContent(formatNetworkSnapshotSequenceReport(report)),
        structuredContent: {
          ok: report.ok,
          beforePath: report.beforePath,
          afterPath: report.afterPath,
          summary: report.summary,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    if (params.name === 'playback_replay_artifact') {
      const replayPath = resolveRepoPath(args.replayPath);
      const scenePath = typeof args.scenePath === 'string' ? resolveRepoPath(args.scenePath) : null;
      const report = await playbackFirstLoopReplayArtifact(replayPath, scenePath);
      return {
        content: toTextContent(formatReplayArtifactPlaybackReport(report)),
        structuredContent: {
          ok: report.ok,
          replayPath: report.replayPath,
          scenePath: report.scenePath,
          expectedDigest: report.expectedDigest,
          actualDigest: report.actualDigest,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    if (params.name === 'simulate_network_replication') {
      const snapshotPaths = args.paths.map((snapshotPath) => resolveRepoPath(snapshotPath));
      const report = await simulateNetworkReplication(snapshotPaths);
      return {
        content: toTextContent(formatNetworkReplicationSimulationReport(report)),
        structuredContent: {
          ok: report.ok,
          snapshotCount: report.snapshotCount,
          timeline: report.timeline,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    const targetPath = resolveRepoPath(args.path);

    if (params.name === 'validate_scene') {
      const report = await validateSceneFile(targetPath);
      return {
        content: toTextContent(formatValidationReport(report)),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          summary: report.summary,
          errors: report.errors,
          warnings: report.warnings
        },
        isError: !report.ok
      };
    }



    if (params.name === 'validate_scene_assets') {
      const manifestPath = resolveRepoPath(args.manifestPath);
      const report = await validateSceneAssetRefs(targetPath, manifestPath);
      return {
        content: toTextContent(formatSceneAssetValidationReport(report)),
        structuredContent: {
          ok: report.ok,
          scenePath: report.scenePath,
          manifestPath: report.manifestPath,
          missingAssetRefs: report.missingAssetRefs,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    if (params.name === 'simulate_first_loop') {
      const ticks = Number.isInteger(args.ticks) && args.ticks > 0 ? args.ticks : 1;
      const report = await runFirstSystemLoop(targetPath, ticks);
      return {
        content: toTextContent(formatFirstSystemLoopReport(report)),
        structuredContent: {
          ok: true,
          path: targetPath,
          report
        },
        isError: false
      };
    }

    if (params.name === 'benchmark_first_loop') {
      const ticks = Number.isInteger(args.ticks) && args.ticks > 0 ? args.ticks : 3;
      const runs = Number.isInteger(args.runs) && args.runs > 0 ? args.runs : 5;
      const report = await benchmarkFirstSystemLoop(targetPath, { ticks, runs });
      return {
        content: toTextContent(formatFirstLoopBenchmarkReport(report)),
        structuredContent: {
          ok: true,
          path: targetPath,
          report
        },
        isError: false
      };
    }

    if (params.name === 'replay_first_loop') {
      const ticks = Number.isInteger(args.ticks) && args.ticks > 0 ? args.ticks : 3;
      const report = await replayFirstSystemLoop(targetPath, ticks);
      return {
        content: toTextContent(formatReplayFirstLoopReport(report)),
        structuredContent: {
          ok: true,
          path: targetPath,
          report
        },
        isError: false
      };
    }

    if (params.name === 'verify_replay_determinism') {
      const ticks = Number.isInteger(args.ticks) && args.ticks > 0 ? args.ticks : 3;
      const runs = Number.isInteger(args.runs) && args.runs > 0 ? args.runs : 2;
      const report = await verifyReplayDeterminism(targetPath, { ticks, runs });
      return {
        content: toTextContent(formatReplayDeterminismReport(report)),
        structuredContent: {
          ok: report.ok,
          path: targetPath,
          report
        },
        isError: !report.ok
      };
    }



    if (params.name === 'validate_input') {
      const report = await validateInputBindingsFile(targetPath);
      return {
        content: toTextContent(formatInputValidationReport(report)),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          actionCount: Array.isArray(report.bindings.actions) ? report.bindings.actions.length : 0,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    if (params.name === 'validate_save') {
      const report = await validateSaveFile(targetPath);
      return {
        content: toTextContent(formatSaveValidationReport(report)),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          scene: report.save.world?.scene ?? null,
          errors: report.errors
        },
        isError: !report.ok
      };
    }


    if (params.name === 'inspect_world') {
      const componentKind = typeof args.componentKind === 'string' ? args.componentKind : null;
      const systemName = typeof args.systemName === 'string' ? args.systemName : null;
      const world = await loadWorldFromSceneFile(targetPath);
      const summary = summarizeWorld(world, { componentKind, systemName });
      return {
        content: toTextContent(formatWorldSummary(summary)),
        structuredContent: {
          ok: true,
          path: targetPath,
          summary
        },
        isError: false
      };
    }

    if (params.name === 'inspect_scene_hierarchy') {
      const componentKind = typeof args.componentKind === 'string' ? args.componentKind : null;
      const systemName = typeof args.systemName === 'string' ? args.systemName : null;
      const report = await inspectSceneHierarchyFile(targetPath, { componentKind, systemName });
      return {
        content: toTextContent(formatSceneHierarchyReport(report)),
        structuredContent: {
          ok: true,
          path: targetPath,
          report
        },
        isError: false
      };
    }


    if (params.name === 'validate_ui') {
      const report = await validateUILayoutFile(targetPath);
      return {
        content: toTextContent(formatUILayoutReport(report)),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          screen: report.layout.screen ?? null,
          errors: report.errors
        },
        isError: !report.ok
      };
    }


    if (params.name === 'validate_render') {
      const report = await validateRenderProfileFile(targetPath);
      return {
        content: toTextContent(formatRenderValidationReport(report)),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          backend: report.profile.pipeline?.backend ?? null,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    if (params.name === 'validate_network') {
      const report = await validateNetMessageFile(targetPath);
      return {
        content: toTextContent(formatNetMessageValidationReport(report)),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          opcode: report.message.opcode ?? null,
          direction: report.message.direction ?? null,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    if (params.name === 'validate_prefab') {
      const report = await validatePrefabFile(targetPath);
      return {
        content: toTextContent(formatPrefabValidationReport(report)),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          prefabId: report.prefab.id ?? null,
          errors: report.errors
        },
        isError: !report.ok
      };
    }

    const scene = await loadSceneFile(targetPath);
    const description = describeScene(scene);

    return {
      content: toTextContent(JSON.stringify(description, null, 2)),
      structuredContent: {
        ok: true,
        path: targetPath,
        description
      },
      isError: false
    };
  } catch (error) {
    return {
      content: toTextContent(error.message),
      structuredContent: {
        ok: false,
        errorName: error.name,
        errorMessage: error.message
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
        'Use validate_scene to validate scene JSON files before changing contracts or fixtures.'
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
