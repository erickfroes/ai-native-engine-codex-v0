import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildSceneCompositionManifestReportV1 } from '../src/index.mjs';
import { assertSceneCompositionManifestReportV1 } from './helpers/assertSceneCompositionManifestReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const validManifestPath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'scene-composition',
  'three-scene-composition.manifest.json'
);
const invalidManifestPath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'scene-composition',
  'invalid-scene.manifest.json'
);

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

async function initializeMcp(mcp) {
  const initResponse = await mcp.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });
  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  mcp.notify('notifications/initialized');
}

test('SceneCompositionManifestReport v1 stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildSceneCompositionManifestReportV1(validManifestPath);
  assertSceneCompositionManifestReportV1(runtimeReport);

  const cliResult = runCli(['inspect-scene-composition', validManifestPath, '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  assertSceneCompositionManifestReportV1(cliReport);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_scene_composition',
      arguments: {
        path: './engine/runtime/test/fixtures/scene-composition/three-scene-composition.manifest.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpReport = mcpResponse.result.structuredContent;
    assertSceneCompositionManifestReportV1(mcpReport);

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
  } finally {
    await mcp.close();
  }
});

test('SceneCompositionManifestReport v1 invalid scene refs stay aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildSceneCompositionManifestReportV1(invalidManifestPath);
  assertSceneCompositionManifestReportV1(runtimeReport);
  assert.equal(runtimeReport.ok, false);

  const cliResult = runCli(['inspect-scene-composition', invalidManifestPath, '--json']);
  assert.equal(cliResult.status, 1);
  const cliReport = JSON.parse(cliResult.stdout);
  assertSceneCompositionManifestReportV1(cliReport);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_scene_composition',
      arguments: {
        path: './engine/runtime/test/fixtures/scene-composition/invalid-scene.manifest.json'
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    const mcpReport = mcpResponse.result.structuredContent;
    assertSceneCompositionManifestReportV1(mcpReport);

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
  } finally {
    await mcp.close();
  }
});

test('inspect_scene_composition rejects invalid MCP arguments predictably', async () => {
  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const missingPath = await mcp.request('tools/call', {
      name: 'inspect_scene_composition',
      arguments: {}
    });

    assert.equal(missingPath.result.isError, true);
    assert.match(missingPath.result.content[0].text, /`path` argument is required/);

    const unexpected = await mcp.request('tools/call', {
      name: 'inspect_scene_composition',
      arguments: {
        path: './engine/runtime/test/fixtures/scene-composition/three-scene-composition.manifest.json',
        fromPath: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(unexpected.result.isError, true);
    assert.match(unexpected.result.content[0].text, /unexpected argument `fromPath`/);
  } finally {
    await mcp.close();
  }
});
