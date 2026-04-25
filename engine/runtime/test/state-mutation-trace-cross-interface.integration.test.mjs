import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertStateSimulationReportV1 } from './helpers/assertStateSimulationReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const movementPath = path.join(repoRoot, 'scenes', 'state', 'movement.scene.json');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');

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

function normalizeTraceEnvelope(envelope) {
  return {
    report: envelope.report,
    mutationTrace: envelope.mutationTrace
  };
}

function assertTraceEnvelope(envelope) {
  assert.deepEqual(Object.keys(envelope).sort(), ['mutationTrace', 'report']);
  assertStateSimulationReportV1(envelope.report);

  assert.equal(envelope.report.stateSimulationReportVersion, 1);
  assert.equal(envelope.report.finalSnapshot.entities[0].components.transform.fields.x, 6);
  assert.equal(envelope.report.finalSnapshot.entities[0].components.transform.fields.y, 9);

  assert.equal(envelope.mutationTrace.stateMutationTraceVersion, 1);
  assert.equal(envelope.mutationTrace.ticks, 3);
  assert.equal(envelope.mutationTrace.seed, 10);
  assert.equal(envelope.mutationTrace.mutationsByTick.length, 3);

  const expectedByTick = [
    { before: { x: 0, y: 0 }, after: { x: 2, y: 3 } },
    { before: { x: 2, y: 3 }, after: { x: 4, y: 6 } },
    { before: { x: 4, y: 6 }, after: { x: 6, y: 9 } }
  ];

  for (const [index, tickTrace] of envelope.mutationTrace.mutationsByTick.entries()) {
    assert.equal(tickTrace.tick, index + 1);

    const movementProcessor = tickTrace.processors.find((processor) => processor.name === 'movement.integrate');
    assert.ok(movementProcessor);

    const playerTransformMutation = movementProcessor.mutations.find(
      (mutation) => mutation.entityId === 'player' && mutation.component === 'transform'
    );

    assert.ok(playerTransformMutation);
    assert.ok(playerTransformMutation.fieldsChanged.includes('x'));
    assert.ok(playerTransformMutation.fieldsChanged.includes('y'));
    assert.deepEqual(playerTransformMutation.before, expectedByTick[index].before);
    assert.deepEqual(playerTransformMutation.after, expectedByTick[index].after);
  }
}

test('State Mutation Trace v1 stays semantically aligned across CLI and MCP with trace enabled', async () => {
  const cliFirstResult = runCli([
    'simulate-state',
    movementPath,
    '--ticks',
    '3',
    '--seed',
    '10',
    '--json',
    '--trace'
  ]);
  const cliSecondResult = runCli([
    'simulate-state',
    movementPath,
    '--ticks',
    '3',
    '--seed',
    '10',
    '--json',
    '--trace'
  ]);

  assert.equal(cliFirstResult.status, 0, cliFirstResult.stderr);
  assert.equal(cliSecondResult.status, 0, cliSecondResult.stderr);

  const cliFirstEnvelope = normalizeTraceEnvelope(JSON.parse(cliFirstResult.stdout));
  const cliSecondEnvelope = normalizeTraceEnvelope(JSON.parse(cliSecondResult.stdout));

  assertTraceEnvelope(cliFirstEnvelope);
  assert.deepEqual(cliFirstEnvelope, cliSecondEnvelope);

  const mcp = createMcpClient();

  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpFirstResponse = await mcp.request('tools/call', {
      name: 'simulate_state',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        trace: true
      }
    });
    const mcpSecondResponse = await mcp.request('tools/call', {
      name: 'simulate_state',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        trace: true
      }
    });

    assert.equal(mcpFirstResponse.result.isError, false);
    assert.equal(mcpSecondResponse.result.isError, false);

    const mcpFirstEnvelope = normalizeTraceEnvelope(mcpFirstResponse.result.structuredContent);
    const mcpSecondEnvelope = normalizeTraceEnvelope(mcpSecondResponse.result.structuredContent);

    assertTraceEnvelope(mcpFirstEnvelope);
    assert.deepEqual(mcpFirstEnvelope, mcpSecondEnvelope);
    assert.deepEqual(cliFirstEnvelope, mcpFirstEnvelope);
  } finally {
    await mcp.close();
  }
});
