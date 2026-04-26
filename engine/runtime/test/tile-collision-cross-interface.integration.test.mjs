import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, buildTileCollisionReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const solidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'tile-collision-solid.scene.json');
const emptyScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'tile-collision-empty.scene.json');

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

async function callMcpTool(name, args) {
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
      name,
      arguments: args
    });
  } finally {
    await mcp.close();
  }
}

test('TileCollisionReport v1 stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildTileCollisionReportV1(solidScenePath);
  const cliResult = runCli(['inspect-tile-collision', solidScenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_tile_collision', {
    path: './engine/runtime/test/fixtures/tile-collision-solid.scene.json'
  });

  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
  assert.deepEqual(Object.keys(runtimeReport).sort(), ['scene', 'tileCollisionReportVersion', 'tiles']);
});

test('TileCollisionReport v1 returns empty tiles across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildTileCollisionReportV1(emptyScenePath);
  const cliResult = runCli(['inspect-tile-collision', emptyScenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_tile_collision', {
    path: './engine/runtime/test/fixtures/tile-collision-empty.scene.json'
  });

  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
  assert.deepEqual(runtimeReport, {
    tileCollisionReportVersion: 1,
    scene: 'tile-collision-empty-fixture',
    tiles: []
  });
});

test('tile collision does not change RenderSnapshot v1 tile.layer output', async () => {
  const snapshot = await buildRenderSnapshotV1(solidScenePath);

  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'map.walls.tile.0.0',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
      layer: -10
    },
    {
      kind: 'rect',
      id: 'map.walls.tile.0.2',
      x: 32,
      y: 0,
      width: 24,
      height: 24,
      layer: -10
    },
    {
      kind: 'rect',
      id: 'map.walls.tile.1.1',
      x: 16,
      y: 16,
      width: 16,
      height: 16,
      layer: -10
    }
  ]);
});
