import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  loadStateSnapshotSaveV1,
  saveStateSnapshotV1,
  simulateStateV1
} from '../src/index.mjs';
import { assertStateSnapshotV1 } from './helpers/assertStateSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const movementScenePath = path.join(repoRoot, 'scenes', 'state', 'movement.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function createMcpClient() {
  const child = spawn(process.execPath, [mcpServerPath], {
    cwd: repoRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const pending = new Map();
  let nextId = 1;
  let buffer = '';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const message = JSON.parse(line);
      if (message.id !== undefined && pending.has(message.id)) {
        const { resolve } = pending.get(message.id);
        pending.delete(message.id);
        resolve(message);
      }
    }
  });

  child.stderr.resume();

  function request(method, params) {
    const id = nextId++;
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })}\n`);
    return new Promise((resolve) => {
      pending.set(id, { resolve });
    });
  }

  function notify(method, params) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) })}\n`);
  }

  async function close() {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
  }

  return { request, notify, close };
}

async function initializeMcpClient() {
  const client = createMcpClient();
  const initResponse = await client.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: {
      name: 'node-test',
      version: '1.0.0'
    }
  });

  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  client.notify('notifications/initialized');
  return client;
}

async function createTempRepoDir(t) {
  const directory = await mkdtemp(path.join(repoRoot, '.tmp-save-load-cross-interface-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

function toRepoRelativePath(targetPath) {
  return path.relative(repoRoot, targetPath);
}

function normalizeSaveResult(result) {
  return {
    save: result.save
  };
}

function normalizeLoadResult(result) {
  return {
    save: result.save,
    snapshot: result.snapshot
  };
}

test('minimal save/load stays aligned across runtime, CLI and MCP', async (t) => {
  const tempRoot = await createTempRepoDir(t);
  const runtimeOutDir = path.join(tempRoot, 'runtime');
  const cliOutDir = path.join(tempRoot, 'cli');
  const mcpOutDir = path.join(tempRoot, 'mcp');
  const ticks = 3;
  const seed = 10;

  const simulation = await simulateStateV1(movementScenePath, { ticks, seed });
  const runtimeSaved = await saveStateSnapshotV1({
    snapshot: simulation.finalSnapshot,
    outDir: runtimeOutDir,
    seed: simulation.seed,
    contentVersion: 1
  });
  const runtimeLoaded = await loadStateSnapshotSaveV1(runtimeSaved.savePath);

  const cliSaveResponse = runCli([
    'save-state',
    movementScenePath,
    '--ticks',
    String(ticks),
    '--seed',
    String(seed),
    '--out',
    cliOutDir,
    '--json'
  ]);
  assert.equal(cliSaveResponse.status, 0, cliSaveResponse.stderr);
  const cliSaved = JSON.parse(cliSaveResponse.stdout);

  const cliLoadResponse = runCli(['load-save', cliSaved.savePath, '--json']);
  assert.equal(cliLoadResponse.status, 0, cliLoadResponse.stderr);
  const cliLoaded = JSON.parse(cliLoadResponse.stdout);

  const mcp = await initializeMcpClient();
  try {
    const mcpSaveResponse = await mcp.request('tools/call', {
      name: 'save_state_snapshot',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks,
        seed,
        outDir: toRepoRelativePath(mcpOutDir)
      }
    });

    assert.equal(mcpSaveResponse.result.isError, false);
    const mcpSaved = mcpSaveResponse.result.structuredContent;

    const mcpLoadResponse = await mcp.request('tools/call', {
      name: 'load_save',
      arguments: {
        path: toRepoRelativePath(mcpSaved.savePath)
      }
    });

    assert.equal(mcpLoadResponse.result.isError, false);
    const mcpLoaded = mcpLoadResponse.result.structuredContent;

    assertStateSnapshotV1(runtimeLoaded.snapshot);
    assertStateSnapshotV1(cliLoaded.snapshot);
    assertStateSnapshotV1(mcpLoaded.snapshot);

    assert.deepEqual(normalizeSaveResult({
      save: runtimeSaved.envelope
    }), normalizeSaveResult(cliSaved));
    assert.deepEqual(normalizeSaveResult(cliSaved), normalizeSaveResult(mcpSaved));

    assert.deepEqual(normalizeLoadResult({
      save: runtimeLoaded.envelope,
      snapshot: runtimeLoaded.snapshot
    }), normalizeLoadResult(cliLoaded));
    assert.deepEqual(normalizeLoadResult(cliLoaded), normalizeLoadResult(mcpLoaded));

    const runtimeSaveFile = await readFile(runtimeSaved.savePath, 'utf8');
    const runtimePayloadFile = await readFile(runtimeSaved.payloadPath, 'utf8');
    const cliSaveFile = await readFile(cliSaved.savePath, 'utf8');
    const cliPayloadFile = await readFile(cliSaved.payloadPath, 'utf8');
    const mcpSaveFile = await readFile(mcpSaved.savePath, 'utf8');
    const mcpPayloadFile = await readFile(mcpSaved.payloadPath, 'utf8');

    assert.equal(runtimeSaveFile, cliSaveFile);
    assert.equal(runtimeSaveFile, mcpSaveFile);
    assert.equal(runtimePayloadFile, cliPayloadFile);
    assert.equal(runtimePayloadFile, mcpPayloadFile);
  } finally {
    await mcp.close();
  }
});
