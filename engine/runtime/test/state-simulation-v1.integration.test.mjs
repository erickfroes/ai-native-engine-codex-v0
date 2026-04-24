import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  simulateStateV1,
  loadSceneFile,
  runMinimalSystemLoop
} from '../src/index.mjs';
import { assertStateSimulationReportV1 } from './helpers/assertStateSimulationReportV1.mjs';
import { assertStateSnapshotV1 } from './helpers/assertStateSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialPath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const movementPath = path.join(repoRoot, 'scenes', 'state', 'movement.scene.json');
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

test('simulateStateV1 movement integration is deterministic and mutates transform using velocity', async () => {
  const reportA = await simulateStateV1(movementPath, { ticks: 3, seed: 10 });
  const reportB = await simulateStateV1(movementPath, { ticks: 3, seed: 10 });

  assertStateSimulationReportV1(reportA);
  assertStateSimulationReportV1(reportB);

  assert.equal(reportA.scene, 'movement');
  assert.equal(reportA.seed, 10);
  assert.equal(reportA.ticksExecuted, 3);
  assert.equal(reportA.finalSnapshot.tick, 3);
  assert.equal(reportA.finalSnapshot.entities[0].id, 'player');
  assert.equal(reportA.finalSnapshot.entities[0].components.transform.fields.x, 6);
  assert.equal(reportA.finalSnapshot.entities[0].components.transform.fields.y, 9);
  assert.ok(reportA.steps[0].processors[0].mutatedEntities.includes('player'));
  assert.deepEqual(reportA, reportB);
});

test('simulateStateV1 default seed remains 1337 and movement result stays stable', async () => {
  const report = await simulateStateV1(movementPath, { ticks: 3 });
  assertStateSimulationReportV1(report);
  assert.equal(report.seed, 1337);
  assert.equal(report.finalSnapshot.tick, 3);
  assert.equal(report.finalSnapshot.entities[0].components.transform.fields.x, 6);
  assert.equal(report.finalSnapshot.entities[0].components.transform.fields.y, 9);
});

test('simulate-state CLI and simulate_state MCP return StateSimulationReport v1', async () => {
  const cliResult = runCli(['simulate-state', movementPath, '--ticks', '3', '--seed', '10', '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  assertStateSimulationReportV1(cliReport);
  assert.equal(cliReport.finalSnapshot.entities[0].components.transform.fields.x, 6);
  assert.equal(cliReport.finalSnapshot.entities[0].components.transform.fields.y, 9);

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
      name: 'simulate_state',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10
      }
    });

    assert.equal(response.result.isError, false);
    assertStateSimulationReportV1(response.result.structuredContent);
    assert.equal(response.result.structuredContent.finalSnapshot.entities[0].components.transform.fields.x, 6);
    assert.equal(response.result.structuredContent.finalSnapshot.entities[0].components.transform.fields.y, 9);
  } finally {
    await mcp.close();
  }
});

test('non-regression: existing loop/report/trace/plan/validation/inspect contracts stay intact', async () => {
  const scene = await loadSceneFile(tutorialPath);
  const explicitLoop = runMinimalSystemLoop(scene, { ticks: 4, seed: 10 });
  const defaultLoop = runMinimalSystemLoop(scene, { ticks: 4 });
  assert.equal(explicitLoop.finalState, 34);
  assert.equal(defaultLoop.finalState, 1361);

  const runLoopJson = JSON.parse(runCli(['run-loop', tutorialPath, '--ticks', '4', '--seed', '10', '--json']).stdout);
  assert.deepEqual(Object.keys(runLoopJson).sort(), [
    'executedSystems',
    'finalState',
    'loopReportVersion',
    'scene',
    'seed',
    'ticks',
    'ticksExecuted'
  ]);

  const runLoopTraceJson = JSON.parse(runCli(['run-loop', tutorialPath, '--ticks', '4', '--json', '--trace']).stdout);
  assert.deepEqual(Object.keys(runLoopTraceJson).sort(), ['report', 'trace']);

  const planJson = JSON.parse(runCli(['plan-loop', tutorialPath, '--ticks', '4', '--json']).stdout);
  assert.equal(planJson.executionPlanVersion, 1);

  const validationJson = JSON.parse(runCli(['validate-scene', tutorialPath, '--json']).stdout);
  assert.equal(validationJson.sceneValidationReportVersion, 1);

  const inspectJson = JSON.parse(runCli(['inspect-state', tutorialPath, '--json']).stdout);
  assertStateSnapshotV1(inspectJson);
  assert.equal(inspectJson.stateSnapshotVersion, 1);
});
