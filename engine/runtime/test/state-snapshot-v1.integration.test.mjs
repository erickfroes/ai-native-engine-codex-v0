import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  createInitialStateFromScene,
  snapshotStateV1,
  createLoopExecutionPlan,
  validateLoopScene,
  loadSceneFile,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace
} from '../src/index.mjs';
import { assertStateSnapshotV1 } from './helpers/assertStateSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialPath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
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

test('State Model v1 creates deterministic State Snapshot v1 from tutorial scene', async () => {
  const stateDefaultSeed = await createInitialStateFromScene(tutorialPath);
  const stateExplicitSeed = await createInitialStateFromScene(tutorialPath, { seed: 10 });
  const snapshotA = snapshotStateV1(stateDefaultSeed);
  const snapshotB = snapshotStateV1(await createInitialStateFromScene(tutorialPath));

  assertStateSnapshotV1(snapshotA);
  assertStateSnapshotV1(snapshotB);
  assertStateSnapshotV1(snapshotStateV1(stateExplicitSeed));

  assert.equal(snapshotA.seed, 1337);
  assert.equal(snapshotA.tick, 0);
  assert.equal(snapshotA.scene, 'tutorial');
  assert.equal(snapshotA.entities.length, 2);
  assert.equal(snapshotA.entities[0].id, 'player.hero');
  assert.equal(snapshotA.entities[1].id, 'camera.main');
  assert.deepEqual(snapshotA.entities[0].components.health, {
    fields: { current: 100, max: 100 },
    replicated: true,
    version: 1
  });
  assert.deepEqual(snapshotA, snapshotB);

  const explicitSnapshot = snapshotStateV1(stateExplicitSeed);
  assert.equal(explicitSnapshot.seed, 10);
  assert.equal(explicitSnapshot.tick, 0);
});

test('inspect-state CLI and inspect_state MCP return State Snapshot v1', async () => {
  const cliDefault = runCli(['inspect-state', tutorialPath, '--json']);
  assert.equal(cliDefault.status, 0, cliDefault.stderr);
  const cliDefaultSnapshot = JSON.parse(cliDefault.stdout);
  assertStateSnapshotV1(cliDefaultSnapshot);
  assert.equal(cliDefaultSnapshot.seed, 1337);

  const cliSeeded = runCli(['inspect-state', tutorialPath, '--seed', '10', '--json']);
  assert.equal(cliSeeded.status, 0, cliSeeded.stderr);
  const cliSeededSnapshot = JSON.parse(cliSeeded.stdout);
  assertStateSnapshotV1(cliSeededSnapshot);
  assert.equal(cliSeededSnapshot.seed, 10);

  const mcp = createMcpClient();
  try {
    const init = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpSnapshot = await mcp.request('tools/call', {
      name: 'inspect_state',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(mcpSnapshot.result.isError, false);
    assertStateSnapshotV1(mcpSnapshot.result.structuredContent);
    assert.equal(mcpSnapshot.result.structuredContent.seed, 1337);
  } finally {
    await mcp.close();
  }
});

test('existing v1 contracts remain unchanged for run-loop, trace, plan-loop and validate-scene', async () => {
  const loopScene = await loadSceneFile(tutorialPath);
  const loopReport = runMinimalSystemLoop(loopScene, { ticks: 4, seed: 10 });
  assert.equal(loopReport.finalState, 34);

  const loopDefaultSeed = runMinimalSystemLoop(loopScene, { ticks: 4 });
  assert.equal(loopDefaultSeed.finalState, 1361);

  const traceReport = runMinimalSystemLoopWithTrace(loopScene, { ticks: 4 });
  assert.equal(traceReport.report.seed, 1337);
  assert.equal(traceReport.report.finalState, 1361);

  const plan = await createLoopExecutionPlan(tutorialPath, { ticks: 4 });
  assert.equal(plan.executionPlanVersion, 1);
  assert.equal(plan.seed, 1337);

  const validation = await validateLoopScene(tutorialPath);
  assert.equal(validation.sceneValidationReportVersion, 1);
  assert.equal(validation.valid, true);

  const cliRunLoop = runCli(['run-loop', tutorialPath, '--ticks', '4', '--seed', '10', '--json']);
  assert.equal(cliRunLoop.status, 0, cliRunLoop.stderr);
  const cliRunLoopJson = JSON.parse(cliRunLoop.stdout);
  assert.deepEqual(Object.keys(cliRunLoopJson).sort(), [
    'executedSystems',
    'finalState',
    'loopReportVersion',
    'scene',
    'seed',
    'ticks',
    'ticksExecuted'
  ]);
  assert.equal(cliRunLoopJson.finalState, 34);

  const cliRunTrace = runCli(['run-loop', tutorialPath, '--ticks', '4', '--json', '--trace']);
  assert.equal(cliRunTrace.status, 0, cliRunTrace.stderr);
  const cliRunTraceJson = JSON.parse(cliRunTrace.stdout);
  assert.deepEqual(Object.keys(cliRunTraceJson).sort(), ['report', 'trace']);

  const cliPlan = runCli(['plan-loop', tutorialPath, '--ticks', '4', '--json']);
  assert.equal(cliPlan.status, 0, cliPlan.stderr);
  const cliPlanJson = JSON.parse(cliPlan.stdout);
  assert.equal(cliPlanJson.executionPlanVersion, 1);

  const cliValidate = runCli(['validate-scene', tutorialPath, '--json']);
  assert.equal(cliValidate.status, 0, cliValidate.stderr);
  const cliValidateJson = JSON.parse(cliValidate.stdout);
  assert.equal(cliValidateJson.sceneValidationReportVersion, 1);
});
