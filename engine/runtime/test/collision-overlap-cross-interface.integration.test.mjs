import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildCollisionBoundsReportV1, buildCollisionOverlapReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const overlapScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-overlap.scene.json');
const noOverlapScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'collision-no-overlap.scene.json'
);
const boundsScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-bounds.scene.json');

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

test('CollisionOverlapReport v1 stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildCollisionOverlapReportV1(overlapScenePath);
  const cliResult = runCli(['inspect-collision-overlaps', overlapScenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_collision_overlaps', {
    path: './engine/runtime/test/fixtures/collision-overlap.scene.json'
  });

  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
  assert.deepEqual(runtimeReport, {
    collisionOverlapReportVersion: 1,
    scene: 'collision-overlap-fixture',
    overlaps: [
      {
        entityAId: 'ghost.zone',
        entityBId: 'player.hero',
        solid: false
      },
      {
        entityAId: 'player.hero',
        entityBId: 'wall.block',
        solid: true
      }
    ]
  });
});

test('CollisionOverlapReport v1 returns empty overlaps across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildCollisionOverlapReportV1(noOverlapScenePath);
  const cliResult = runCli(['inspect-collision-overlaps', noOverlapScenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_collision_overlaps', {
    path: './engine/runtime/test/fixtures/collision-no-overlap.scene.json'
  });

  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
  assert.deepEqual(runtimeReport, {
    collisionOverlapReportVersion: 1,
    scene: 'collision-no-overlap-fixture',
    overlaps: []
  });
});

test('inspect_collision_bounds stays intact after adding overlap inspection', async () => {
  const runtimeReport = await buildCollisionBoundsReportV1(boundsScenePath);
  const cliResult = runCli(['inspect-collision-bounds', boundsScenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const mcpResponse = await callMcpTool('inspect_collision_bounds', {
    path: './engine/runtime/test/fixtures/collision-bounds.scene.json'
  });

  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, JSON.parse(cliResult.stdout));
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  assert.deepEqual(Object.keys(runtimeReport).sort(), ['bounds', 'collisionBoundsReportVersion', 'scene']);
});
