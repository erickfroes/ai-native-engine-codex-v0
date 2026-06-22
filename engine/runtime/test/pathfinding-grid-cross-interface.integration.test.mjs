import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildPathfindingGridReportV1 } from '../src/index.mjs';
import { assertPathfindingGridReportV1 } from './helpers/assertPathfindingGridReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const fixturePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'pathfinding-grid-basic.scene.json');
const emptyScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

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

async function initializeMcp(mcp) {
  const initResponse = await mcp.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });
  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  mcp.notify('notifications/initialized');
}

async function callMcpTool(name, args) {
  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    return await mcp.request('tools/call', {
      name,
      arguments: args
    });
  } finally {
    await mcp.close();
  }
}

test('PathfindingGridReport v1 stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildPathfindingGridReportV1(fixturePath);
  assertPathfindingGridReportV1(runtimeReport);

  const cliResult = runCli(['inspect-pathfinding-grid', fixturePath, '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  assertPathfindingGridReportV1(cliReport);

  const mcpResponse = await callMcpTool('inspect_pathfinding_grid', {
    path: './engine/runtime/test/fixtures/pathfinding-grid-basic.scene.json'
  });
  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;
  assertPathfindingGridReportV1(mcpReport);

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
});

test('PathfindingGridReport v1 returns empty grids across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildPathfindingGridReportV1(emptyScenePath);
  assertPathfindingGridReportV1(runtimeReport);

  const cliResult = runCli(['inspect-pathfinding-grid', emptyScenePath, '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);

  const mcpResponse = await callMcpTool('inspect_pathfinding_grid', {
    path: './scenes/tutorial.scene.json'
  });
  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
  assert.deepEqual(runtimeReport.grids, []);
});

test('inspect_pathfinding_grid rejects invalid MCP arguments predictably', async () => {
  const mcpResponse = await callMcpTool('inspect_pathfinding_grid', {});

  assert.equal(mcpResponse.result.isError, true);
  assert.match(mcpResponse.result.content[0].text, /`path` argument is required/);
});
