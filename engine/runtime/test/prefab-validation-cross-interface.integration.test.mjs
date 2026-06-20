import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildPrefabValidationReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const prefabDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'prefabs');
const validPrefabPath = path.join(prefabDir, 'player-actor.prefab.json');
const malformedPrefabPath = path.join(prefabDir, 'invalid-malformed.prefab.json');

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
    return new Promise((resolve) => pending.set(id, { resolve }));
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

async function callMcpTool(args) {
  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    return await mcp.request('tools/call', {
      name: 'validate_prefab',
      arguments: args
    });
  } finally {
    await mcp.close();
  }
}

test('PrefabValidationReport v1 stays aligned across runtime, CLI and MCP for valid prefabs', async () => {
  const runtimeReport = await buildPrefabValidationReportV1(validPrefabPath);
  const cliResult = runCli(['validate-prefab', validPrefabPath, '--json']);
  const mcpResponse = await callMcpTool({
    path: './engine/runtime/test/fixtures/prefabs/player-actor.prefab.json'
  });

  assert.equal(cliResult.status, 0, cliResult.stderr);
  assert.equal(mcpResponse.result.isError, false);

  const cliReport = JSON.parse(cliResult.stdout);
  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
});

test('PrefabValidationReport v1 stays aligned across CLI and MCP for malformed prefabs', async () => {
  const cliResult = runCli(['validate-prefab', malformedPrefabPath, '--json']);
  const mcpResponse = await callMcpTool({
    path: './engine/runtime/test/fixtures/prefabs/invalid-malformed.prefab.json'
  });

  assert.equal(cliResult.status, 1, cliResult.stderr);
  assert.equal(mcpResponse.result.isError, true);

  const cliReport = JSON.parse(cliResult.stdout);
  assert.deepEqual(cliReport, mcpResponse.result.structuredContent);
  assert.deepEqual(cliReport.errors, [
    {
      path: '$',
      message: 'prefab JSON is malformed'
    }
  ]);
});
