import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, runDeterministicReplay, buildReplayArtifact } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

function normalizeReplayArtifact(artifact) {
  return {
    replayArtifactVersion: artifact.replayArtifactVersion,
    scene: artifact.scene,
    ticks: artifact.ticks,
    seed: artifact.seed,
    replaySignature: artifact.replaySignature,
    snapshotOpcode: artifact.snapshotOpcode,
    executedSystemCount: artifact.executedSystemCount,
    finalState: artifact.finalState
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

test('run_replay_artifact stays semantically aligned across runtime, CLI and MCP', async () => {
  const scene = await loadSceneFile(tutorialScenePath);
  const runtimeReplay = runDeterministicReplay(scene, { ticks: 3, seed: 42 });
  const runtimeArtifact = normalizeReplayArtifact(
    buildReplayArtifact(scene.metadata.name, runtimeReplay)
  );

  const expectedKeys = [
    'executedSystemCount',
    'finalState',
    'replayArtifactVersion',
    'replaySignature',
    'scene',
    'seed',
    'snapshotOpcode',
    'ticks'
  ];
  assert.deepEqual(Object.keys(runtimeArtifact).sort(), expectedKeys);
  assert.equal(runtimeArtifact.replayArtifactVersion, 1);
  assert.equal(runtimeArtifact.snapshotOpcode, 'world.snapshot');

  const cliResult = runCli(['run-replay-artifact', tutorialScenePath, '--ticks', '3', '--seed', '42', '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliArtifact = normalizeReplayArtifact(JSON.parse(cliResult.stdout));
  assert.deepEqual(Object.keys(cliArtifact).sort(), expectedKeys);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'run_replay_artifact',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3,
        seed: 42
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpArtifact = normalizeReplayArtifact(mcpResponse.result.structuredContent);
    assert.deepEqual(Object.keys(mcpArtifact).sort(), expectedKeys);
    assert.equal(mcpArtifact.replayArtifactVersion, 1);
    assert.equal(mcpArtifact.snapshotOpcode, 'world.snapshot');

    assert.deepEqual(runtimeArtifact, cliArtifact);
    assert.deepEqual(runtimeArtifact, mcpArtifact);
  } finally {
    await mcp.close();
  }
});
