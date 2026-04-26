import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildCollisionBoundsReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const collisionBoundsScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-bounds.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

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

async function callMcpInspectCollisionBounds(args) {
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
      name: 'inspect_collision_bounds',
      arguments: args
    });
  } finally {
    await mcp.close();
  }
}

test('CollisionBoundsReport v1 stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildCollisionBoundsReportV1(collisionBoundsScenePath);
  const cliResult = runCli(['inspect-collision-bounds', collisionBoundsScenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpInspectCollisionBounds({
    path: './engine/runtime/test/fixtures/collision-bounds.scene.json'
  });

  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
  assert.deepEqual(runtimeReport, {
    collisionBoundsReportVersion: 1,
    scene: 'collision-bounds-fixture',
    bounds: [
      {
        entityId: 'player.hero',
        x: 12,
        y: 15,
        width: 12,
        height: 14,
        solid: true
      },
      {
        entityId: 'wall.block',
        x: 40,
        y: 8,
        width: 16,
        height: 32,
        solid: true
      }
    ]
  });
});

test('CollisionBoundsReport v1 returns empty bounds for scenes without collision.bounds across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildCollisionBoundsReportV1(tutorialScenePath);
  const cliResult = runCli(['inspect-collision-bounds', tutorialScenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpInspectCollisionBounds({
    path: './scenes/tutorial.scene.json'
  });

  assert.equal(mcpResponse.result.isError, false);
  const mcpReport = mcpResponse.result.structuredContent;

  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpReport);
  assert.deepEqual(runtimeReport, {
    collisionBoundsReportVersion: 1,
    scene: 'tutorial',
    bounds: []
  });
});
