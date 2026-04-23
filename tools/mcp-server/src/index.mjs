import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateSceneFile,
  formatValidationReport,
  validateSaveFile,
  loadSceneFile,
  buildWorldSnapshotMessage,
  runDeterministicReplay
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

async function handleToolCall(params) {
  if (!params || typeof params !== 'object') {
    return {
      content: toTextContent('Tool call is missing params.'),
      isError: true
    };
  }

  if (
    params.name !== 'validate_scene' &&
    params.name !== 'validate_save' &&
    params.name !== 'emit_world_snapshot' &&
    params.name !== 'run_replay'
  ) {
    throw Object.assign(new Error(`Unknown tool: ${params.name}`), { code: -32602 });
  }

  const args = params.arguments ?? {};
  if (typeof args.path !== 'string' || args.path.trim().length === 0) {
    return {
      content: toTextContent('The `path` argument is required and must be a non-empty string.'),
      isError: true
    };
  }

  try {
    const targetPath = resolveRepoPath(args.path);

    if (params.name === 'run_replay') {
      if (!Number.isInteger(args.ticks) || args.ticks < 0) {
        return {
          content: toTextContent('run_replay: `ticks` is required and must be an integer >= 0.'),
          isError: true
        };
      }

      if (args.seed !== undefined && !Number.isInteger(args.seed)) {
        return {
          content: toTextContent('run_replay: `seed` must be an integer when provided.'),
          isError: true
        };
      }

      const scene = await loadSceneFile(targetPath);
      const replay = runDeterministicReplay(scene, {
        ticks: args.ticks,
        seed: args.seed
      });
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

    if (params.name === 'validate_save') {
      const report = await validateSaveFile(targetPath);
      return {
        content: toTextContent(report.ok ? 'Save validation passed.' : 'Save validation failed.'),
        structuredContent: {
          ok: report.ok,
          path: report.absolutePath,
          saveVersion: report.save.saveVersion,
          contentVersion: report.save.contentVersion,
          seed: report.save.seed,
          checksum: report.save.checksum,
          payloadRef: report.save.payloadRef,
          errors: report.errors,
          warnings: report.warnings
        },
        isError: !report.ok
      };
    }

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
        'Use validate_scene, validate_save, emit_world_snapshot and run_replay for deterministic validation workflows.'
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
