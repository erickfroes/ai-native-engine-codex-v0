import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, runMinimalSystemLoopWithTrace } from '../src/index.mjs';
import { assertLoopReportV1 } from './helpers/assertLoopReportV1.mjs';
import { assertLoopTraceV1 } from './helpers/assertLoopTraceV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
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

function assertEnvelopeV1(envelope) {
  assert.deepEqual(Object.keys(envelope).sort(), ['report', 'trace']);
  assertLoopReportV1(envelope.report);
  assertLoopTraceV1(envelope.trace);
}

test('loop trace envelope stays semantically aligned across runtime, CLI and MCP', async () => {
  const ticks = 4;
  const seed = 10;
  const scene = await loadSceneFile(tutorialScenePath);

  const runtimeFirst = runMinimalSystemLoopWithTrace(scene, { ticks, seed });
  const runtimeSecond = runMinimalSystemLoopWithTrace(scene, { ticks, seed });

  assertEnvelopeV1(runtimeFirst);
  assert.equal(runtimeFirst.report.finalState, 34);
  assert.equal(runtimeFirst.report.ticksExecuted, 4);
  assert.equal(runtimeFirst.trace.systemsPerTick.at(-1).systems.at(-1).stateAfter, runtimeFirst.report.finalState);
  assert.deepEqual(runtimeFirst, runtimeSecond);

  const cliFirstResult = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json', '--trace']);
  const cliSecondResult = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json', '--trace']);
  assert.equal(cliFirstResult.status, 0, cliFirstResult.stderr);
  assert.equal(cliSecondResult.status, 0, cliSecondResult.stderr);

  const cliFirst = JSON.parse(cliFirstResult.stdout);
  const cliSecond = JSON.parse(cliSecondResult.stdout);
  assertEnvelopeV1(cliFirst);
  assert.equal(cliFirst.report.finalState, 34);
  assert.equal(cliFirst.trace.systemsPerTick.at(-1).systems.at(-1).stateAfter, cliFirst.report.finalState);
  assert.deepEqual(cliFirst, cliSecond);

  const cliNoTrace = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json']);
  assert.equal(cliNoTrace.status, 0, cliNoTrace.stderr);
  assertLoopReportV1(JSON.parse(cliNoTrace.stdout));

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
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks,
        seed,
        trace: true
      }
    });
    const mcpSecondResponse = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks,
        seed,
        trace: true
      }
    });

    assert.equal(mcpFirstResponse.result.isError, false);
    assert.equal(mcpSecondResponse.result.isError, false);
    assertEnvelopeV1(mcpFirstResponse.result.structuredContent);
    assert.equal(
      mcpFirstResponse.result.structuredContent.trace.systemsPerTick.at(-1).systems.at(-1).stateAfter,
      mcpFirstResponse.result.structuredContent.report.finalState
    );
    assert.deepEqual(mcpFirstResponse.result.structuredContent, mcpSecondResponse.result.structuredContent);

    const mcpNoTrace = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks,
        seed
      }
    });
    assert.equal(mcpNoTrace.result.isError, false);
    assertLoopReportV1(mcpNoTrace.result.structuredContent);

    assert.deepEqual(runtimeFirst, cliFirst);
    assert.deepEqual(runtimeFirst, mcpFirstResponse.result.structuredContent);
  } finally {
    await mcp.close();
  }
});
