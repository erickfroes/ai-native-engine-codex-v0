import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, runMinimalSystemLoop } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

function normalizeLoopReport(report) {
  return {
    loopReportVersion: report.loopReportVersion,
    scene: report.scene,
    ticks: report.ticks,
    seed: report.seed,
    ticksExecuted: report.ticksExecuted,
    finalState: report.finalState,
    executedSystems: report.executedSystems
  };
}

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

test('run-loop stays semantically aligned across runtime, CLI and MCP', async () => {
  const ticks = 4;
  const seed = 10;
  const scene = await loadSceneFile(tutorialScenePath);

  const runtimeFirst = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks,
    seed,
    ...runMinimalSystemLoop(scene, { ticks, seed })
  });
  const runtimeSecond = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks,
    seed,
    ...runMinimalSystemLoop(scene, { ticks, seed })
  });

  const expectedKeys = [
    'executedSystems',
    'finalState',
    'loopReportVersion',
    'scene',
    'seed',
    'ticks',
    'ticksExecuted'
  ];

  assert.deepEqual(Object.keys(runtimeFirst).sort(), expectedKeys);
  assert.equal(runtimeFirst.loopReportVersion, 1);
  assert.equal(runtimeFirst.finalState, 34);
  assert.equal(runtimeFirst.ticksExecuted, 4);
  assert.deepEqual(runtimeFirst, runtimeSecond);

  const cliFirstResult = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json']);
  const cliSecondResult = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json']);
  assert.equal(cliFirstResult.status, 0, cliFirstResult.stderr);
  assert.equal(cliSecondResult.status, 0, cliSecondResult.stderr);

  const cliFirst = normalizeLoopReport(JSON.parse(cliFirstResult.stdout));
  const cliSecond = normalizeLoopReport(JSON.parse(cliSecondResult.stdout));
  assert.deepEqual(Object.keys(cliFirst).sort(), expectedKeys);
  assert.equal(cliFirst.loopReportVersion, 1);
  assert.equal(cliFirst.finalState, 34);
  assert.equal(cliFirst.ticksExecuted, 4);
  assert.deepEqual(cliFirst, cliSecond);

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
        seed
      }
    });

    const mcpSecondResponse = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks,
        seed
      }
    });

    assert.equal(mcpFirstResponse.result.isError, false);
    assert.equal(mcpSecondResponse.result.isError, false);

    const mcpFirst = normalizeLoopReport(mcpFirstResponse.result.structuredContent);
    const mcpSecond = normalizeLoopReport(mcpSecondResponse.result.structuredContent);
    assert.deepEqual(Object.keys(mcpFirst).sort(), expectedKeys);
    assert.equal(mcpFirst.loopReportVersion, 1);
    assert.equal(mcpFirst.finalState, 34);
    assert.equal(mcpFirst.ticksExecuted, 4);
    assert.deepEqual(mcpFirst, mcpSecond);

    assert.deepEqual(runtimeFirst, cliFirst);
    assert.deepEqual(runtimeFirst, mcpFirst);
  } finally {
    await mcp.close();
  }
});
