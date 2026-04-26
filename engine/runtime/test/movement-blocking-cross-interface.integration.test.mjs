import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildMovementBlockingReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const blockedScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-blocked.scene.json'
);
const openScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-open.scene.json'
);
const inputIntentPath = path.join(repoRoot, 'fixtures', 'input', 'move-player-right.intent.json');
const inputIntent = {
  inputIntentVersion: 1,
  tick: 1,
  entityId: 'player.hero',
  actions: [
    {
      type: 'move',
      axis: { x: 1, y: 0 }
    }
  ]
};

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

test('MovementBlockingReport v1 stays aligned across runtime, CLI and MCP when blocked', async () => {
  const runtimeReport = await buildMovementBlockingReportV1(blockedScenePath, { inputIntent });
  const cliResult = runCli(['inspect-movement-blocking', blockedScenePath, '--input-intent', inputIntentPath, '--json']);
  const mcpResponse = await callMcpTool('inspect_movement_blocking', {
    path: './engine/runtime/test/fixtures/movement-blocking-blocked.scene.json',
    inputIntentPath: './fixtures/input/move-player-right.intent.json'
  });

  assert.equal(cliResult.status, 0, cliResult.stderr);
  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, JSON.parse(cliResult.stdout));
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  assert.deepEqual(runtimeReport, {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-blocked-fixture',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 1, y: 0 },
    final: { x: 0, y: 0 },
    blocked: true,
    blockingEntities: ['wall.block']
  });
});

test('MovementBlockingReport v1 stays aligned across runtime, CLI and MCP when unblocked', async () => {
  const runtimeReport = await buildMovementBlockingReportV1(openScenePath, { inputIntent });
  const cliResult = runCli(['inspect-movement-blocking', openScenePath, '--input-intent', inputIntentPath, '--json']);
  const mcpResponse = await callMcpTool('inspect_movement_blocking', {
    path: './engine/runtime/test/fixtures/movement-blocking-open.scene.json',
    inputIntentPath: './fixtures/input/move-player-right.intent.json'
  });

  assert.equal(cliResult.status, 0, cliResult.stderr);
  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, JSON.parse(cliResult.stdout));
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  assert.equal(runtimeReport.blocked, false);
  assert.deepEqual(runtimeReport.final, { x: 1, y: 0 });
});

test('movement blocking does not change run-loop or render-snapshot outputs', () => {
  const loopResult = runCli(['run-loop', blockedScenePath, '--ticks', '1', '--json']);
  const snapshotResult = runCli(['render-snapshot', blockedScenePath, '--json']);

  assert.equal(loopResult.status, 0, loopResult.stderr);
  assert.equal(snapshotResult.status, 0, snapshotResult.stderr);

  const loopReport = JSON.parse(loopResult.stdout);
  const snapshot = JSON.parse(snapshotResult.stdout);

  assert.equal('movementBlockingReportVersion' in loopReport, false);
  assert.equal('movementBlockingReportVersion' in snapshot, false);
  assert.deepEqual(snapshot.drawCalls.map((drawCall) => [drawCall.id, drawCall.x, drawCall.y]), [
    ['player.hero', 0, 0],
    ['wall.block', 8, 0]
  ]);
});
