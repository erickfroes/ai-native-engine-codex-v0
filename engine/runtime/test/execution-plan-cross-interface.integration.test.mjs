import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  createLoopExecutionPlan,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace,
  loadSceneFile
} from '../src/index.mjs';
import { assertExecutionPlanV1 } from './helpers/assertExecutionPlanV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const missingSystemsPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_missing_systems.scene.json');
const emptySystemsPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_empty_systems.scene.json');
const unknownSystemPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_unknown_system.scene.json');
const malformedPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_malformed.scene.json');
const fileNotFoundPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'does-not-exist.scene.json');

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

async function getMcpPlan(pathToScene, ticks, seed) {
  const mcp = createMcpClient();
  try {
    const init = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const response = await mcp.request('tools/call', {
      name: 'plan_loop',
      arguments: {
        path: pathToScene,
        ticks,
        ...(seed === undefined ? {} : { seed })
      }
    });

    return response.result;
  } finally {
    await mcp.close();
  }
}

test('execution plan v1 stays semantically aligned across runtime, CLI and MCP for valid scene with explicit seed', async () => {
  const ticks = 4;
  const seed = 10;
  const runtimePlan = await createLoopExecutionPlan(tutorialScenePath, { ticks, seed });
  assertExecutionPlanV1(runtimePlan);
  assert.equal(runtimePlan.valid, true);
  assert.equal(runtimePlan.estimated.initialState, 10);
  assert.equal(runtimePlan.estimated.totalDelta, 24);
  assert.equal(runtimePlan.estimated.finalState, 34);
  assert.equal(runtimePlan.systemsPerTick.length, 4);
  assert.deepEqual(runtimePlan.systemsPerTick[0].systems.map((system) => system.name), [
    'core.loop',
    'input.keyboard',
    'networking.replication'
  ]);

  const cliResult = runCli(['plan-loop', tutorialScenePath, '--ticks', String(ticks), '--seed', String(seed), '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliPlan = JSON.parse(cliResult.stdout);
  assertExecutionPlanV1(cliPlan);

  const mcpResult = await getMcpPlan(tutorialScenePath, ticks, seed);
  assert.equal(mcpResult.isError, false);
  const mcpPlan = mcpResult.structuredContent;
  assertExecutionPlanV1(mcpPlan);

  assert.deepEqual(runtimePlan, cliPlan);
  assert.deepEqual(runtimePlan, mcpPlan);
});

test('execution plan v1 resolves default seed to 1337 when omitted', async () => {
  const ticks = 4;
  const runtimePlan = await createLoopExecutionPlan(tutorialScenePath, { ticks });
  assert.equal(runtimePlan.seed, 1337);
  assert.equal(runtimePlan.estimated.finalState, 1361);

  const cliResult = runCli(['plan-loop', tutorialScenePath, '--ticks', String(ticks), '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliPlan = JSON.parse(cliResult.stdout);
  assert.equal(cliPlan.seed, 1337);
  assert.equal(cliPlan.estimated.finalState, 1361);
});

test('execution plan estimate matches real loop report and loop trace final state', async () => {
  const scene = await loadSceneFile(tutorialScenePath);
  const ticks = 4;
  const seed = 10;

  const plan = await createLoopExecutionPlan(tutorialScenePath, { ticks, seed });
  const report = runMinimalSystemLoop(scene, { ticks, seed });
  const traceEnvelope = runMinimalSystemLoopWithTrace(scene, { ticks, seed });

  assert.equal(plan.estimated.finalState, report.finalState);
  assert.equal(
    plan.estimated.finalState,
    traceEnvelope.trace.systemsPerTick.at(-1).systems.at(-1).stateAfter
  );
});

test('execution plan returns valid=false and empty systemsPerTick for invalid scenes', async () => {
  for (const scenePath of [fileNotFoundPath, malformedPath, missingSystemsPath, emptySystemsPath, unknownSystemPath]) {
    const runtimePlan = await createLoopExecutionPlan(scenePath, { ticks: 4, seed: 10 });
    assertExecutionPlanV1(runtimePlan);
    assert.equal(runtimePlan.valid, false);
    assert.equal(runtimePlan.validation.valid, false);
    assert.deepEqual(runtimePlan.systemsPerTick, []);

    const cliResult = runCli(['plan-loop', scenePath, '--ticks', '4', '--seed', '10', '--json']);
    assert.equal(cliResult.status, 1, cliResult.stderr);
    const cliPlan = JSON.parse(cliResult.stdout);
    assert.equal(cliPlan.valid, false);
    assert.deepEqual(cliPlan.systemsPerTick, []);

    const mcpResult = await getMcpPlan(scenePath, 4, 10);
    assert.equal(mcpResult.isError, true);
    assert.equal(mcpResult.structuredContent.valid, false);
    assert.deepEqual(mcpResult.structuredContent.systemsPerTick, []);
  }
});

test('execution plan tick validation remains predictable', async () => {
  await assert.rejects(
    () => createLoopExecutionPlan(tutorialScenePath, { ticks: -1, seed: 10 }),
    /ticks must be an integer >= 0/
  );
  await assert.rejects(
    () => createLoopExecutionPlan(tutorialScenePath, { ticks: 1.5, seed: 10 }),
    /ticks must be an integer >= 0/
  );
  await assert.rejects(
    () => createLoopExecutionPlan(tutorialScenePath, { ticks: 1, seed: 1.5 }),
    /seed must be an integer/
  );

  const ticksZeroPlan = await createLoopExecutionPlan(tutorialScenePath, { ticks: 0, seed: 10 });
  assert.equal(ticksZeroPlan.valid, true);
  assert.equal(ticksZeroPlan.estimated.finalState, 10);
  assert.deepEqual(ticksZeroPlan.systemsPerTick, []);

  const cliInvalidTicks = runCli(['plan-loop', tutorialScenePath, '--ticks', '-1', '--json']);
  assert.equal(cliInvalidTicks.status, 1);
  assert.match(cliInvalidTicks.stderr, /ticks must be an integer >= 0/);

  const mcpInvalidTicks = await getMcpPlan(tutorialScenePath, -1, 10);
  assert.equal(mcpInvalidTicks.isError, true);
  assert.match(mcpInvalidTicks.content[0].text, /plan_loop: `ticks` is required and must be an integer >= 0/);
});
