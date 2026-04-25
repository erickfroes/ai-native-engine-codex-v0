import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, loadValidatedInputIntentV1, runMinimalSystemLoop } from '../src/index.mjs';
import { assertLoopReportV1 } from './helpers/assertLoopReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const inputIntentPath = path.join(repoRoot, 'fixtures', 'input', 'valid.move.intent.json');

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

  assertLoopReportV1(runtimeFirst);
  assert.equal(runtimeFirst.finalState, 34);
  assert.equal(runtimeFirst.ticksExecuted, 4);
  assert.deepEqual(runtimeFirst, runtimeSecond);

  const cliFirstResult = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json']);
  const cliSecondResult = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json']);
  assert.equal(cliFirstResult.status, 0, cliFirstResult.stderr);
  assert.equal(cliSecondResult.status, 0, cliSecondResult.stderr);

  const cliFirst = normalizeLoopReport(JSON.parse(cliFirstResult.stdout));
  const cliSecond = normalizeLoopReport(JSON.parse(cliSecondResult.stdout));
  assertLoopReportV1(cliFirst);
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
    assertLoopReportV1(mcpFirst);
    assert.equal(mcpFirst.finalState, 34);
    assert.equal(mcpFirst.ticksExecuted, 4);
    assert.deepEqual(mcpFirst, mcpSecond);

    assert.deepEqual(runtimeFirst, cliFirst);
    assert.deepEqual(runtimeFirst, mcpFirst);
  } finally {
    await mcp.close();
  }
});

test('run-loop input intent stays opt-in and semantically aligned across runtime, CLI and MCP', async () => {
  const ticks = 4;
  const seed = 10;
  const scene = await loadSceneFile(tutorialScenePath);
  const inputIntent = await loadValidatedInputIntentV1(inputIntentPath);

  const runtimeWithoutIntent = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks,
    seed,
    ...runMinimalSystemLoop(scene, { ticks, seed })
  });
  const runtimeWithIntentFirst = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks,
    seed,
    ...runMinimalSystemLoop(scene, { ticks, seed, inputIntent })
  });
  const runtimeWithIntentSecond = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks,
    seed,
    ...runMinimalSystemLoop(scene, { ticks, seed, inputIntent })
  });

  assertLoopReportV1(runtimeWithoutIntent);
  assertLoopReportV1(runtimeWithIntentFirst);
  assert.equal(runtimeWithoutIntent.finalState, 34);
  assert.equal(runtimeWithIntentFirst.finalState, 31);
  assert.equal(runtimeWithoutIntent.ticksExecuted, 4);
  assert.equal(runtimeWithIntentFirst.ticksExecuted, 4);
  assert.deepEqual(runtimeWithIntentFirst, runtimeWithIntentSecond);
  assert.notEqual(runtimeWithoutIntent.finalState, runtimeWithIntentFirst.finalState);

  const cliWithoutIntentResult = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json']);
  const cliWithIntentFirstResult = runCli([
    'run-loop',
    tutorialScenePath,
    '--ticks',
    String(ticks),
    '--seed',
    String(seed),
    '--input-intent',
    inputIntentPath,
    '--json'
  ]);
  const cliWithIntentSecondResult = runCli([
    'run-loop',
    tutorialScenePath,
    '--ticks',
    String(ticks),
    '--seed',
    String(seed),
    '--input-intent',
    inputIntentPath,
    '--json'
  ]);
  assert.equal(cliWithoutIntentResult.status, 0, cliWithoutIntentResult.stderr);
  assert.equal(cliWithIntentFirstResult.status, 0, cliWithIntentFirstResult.stderr);
  assert.equal(cliWithIntentSecondResult.status, 0, cliWithIntentSecondResult.stderr);

  const cliWithoutIntent = normalizeLoopReport(JSON.parse(cliWithoutIntentResult.stdout));
  const cliWithIntentFirst = normalizeLoopReport(JSON.parse(cliWithIntentFirstResult.stdout));
  const cliWithIntentSecond = normalizeLoopReport(JSON.parse(cliWithIntentSecondResult.stdout));
  assertLoopReportV1(cliWithoutIntent);
  assertLoopReportV1(cliWithIntentFirst);
  assert.equal(cliWithoutIntent.finalState, 34);
  assert.equal(cliWithIntentFirst.finalState, 31);
  assert.deepEqual(cliWithIntentFirst, cliWithIntentSecond);
  assert.deepEqual(cliWithoutIntent, runtimeWithoutIntent);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpWithoutIntentResponse = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks,
        seed
      }
    });
    const mcpWithIntentFirstResponse = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks,
        seed,
        inputIntentPath: './fixtures/input/valid.move.intent.json'
      }
    });
    const mcpWithIntentSecondResponse = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks,
        seed,
        inputIntentPath: './fixtures/input/valid.move.intent.json'
      }
    });

    assert.equal(mcpWithoutIntentResponse.result.isError, false);
    assert.equal(mcpWithIntentFirstResponse.result.isError, false);
    assert.equal(mcpWithIntentSecondResponse.result.isError, false);

    const mcpWithoutIntent = normalizeLoopReport(mcpWithoutIntentResponse.result.structuredContent);
    const mcpWithIntentFirst = normalizeLoopReport(mcpWithIntentFirstResponse.result.structuredContent);
    const mcpWithIntentSecond = normalizeLoopReport(mcpWithIntentSecondResponse.result.structuredContent);
    assertLoopReportV1(mcpWithoutIntent);
    assertLoopReportV1(mcpWithIntentFirst);
    assert.equal(mcpWithoutIntent.finalState, 34);
    assert.equal(mcpWithIntentFirst.finalState, 31);
    assert.deepEqual(mcpWithIntentFirst, mcpWithIntentSecond);

    assert.deepEqual(runtimeWithoutIntent, mcpWithoutIntent);
    assert.deepEqual(runtimeWithIntentFirst, cliWithIntentFirst);
    assert.deepEqual(runtimeWithIntentFirst, mcpWithIntentFirst);
    assert.deepEqual(cliWithIntentFirst, mcpWithIntentFirst);
  } finally {
    await mcp.close();
  }
});
