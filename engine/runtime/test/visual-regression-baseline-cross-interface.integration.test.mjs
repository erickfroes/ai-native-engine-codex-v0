import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildVisualRegressionBaselineReportV1 } from '../src/index.mjs';
import { assertVisualRegressionBaselineReportV1 } from './helpers/assertVisualRegressionBaselineReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const v1SmallScenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const unsafePrefabPathsScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_prefab_unsafe_paths.scene.json'
);
const unsafePrefabPathsSceneMcpPath = './engine/runtime/test/fixtures/invalid_prefab_unsafe_paths.scene.json';

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

test('VisualRegressionBaselineReport v1 stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildVisualRegressionBaselineReportV1(v1SmallScenePath);
  assertVisualRegressionBaselineReportV1(runtimeReport);

  const cliResult = runCli([
    'inspect-visual-regression-baseline',
    v1SmallScenePath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  assertVisualRegressionBaselineReportV1(cliReport);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_visual_regression_baseline',
      arguments: {
        path: './scenes/v1-small-2d.scene.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpReport = mcpResponse.result.structuredContent;
    assertVisualRegressionBaselineReportV1(mcpReport);

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
  } finally {
    await mcp.close();
  }
});

test('VisualRegressionBaselineReport v1 with asset manifest stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildVisualRegressionBaselineReportV1(visualSpriteScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });
  assertVisualRegressionBaselineReportV1(runtimeReport);

  const cliResult = runCli([
    'inspect-visual-regression-baseline',
    visualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  assertVisualRegressionBaselineReportV1(cliReport);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_visual_regression_baseline',
      arguments: {
        path: './fixtures/assets/visual-sprite.scene.json',
        assetManifestPath: './fixtures/assets/visual-sprite.asset-manifest.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpReport = mcpResponse.result.structuredContent;
    assertVisualRegressionBaselineReportV1(mcpReport);

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
    assert.deepEqual(runtimeReport.uniqueSpriteAssetIds, ['player.sprite']);
  } finally {
    await mcp.close();
  }
});

test('VisualRegressionBaselineReport v1 fails predictably across runtime, CLI and MCP for unsafe prefab path references', async () => {
  await assert.rejects(
    () => buildVisualRegressionBaselineReportV1(unsafePrefabPathsScenePath),
    /Scene validation failed/
  );

  const cliResult = runCli([
    'inspect-visual-regression-baseline',
    unsafePrefabPathsScenePath,
    '--json'
  ]);

  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /SceneValidationError: Scene validation failed for/);
  assert.match(cliResult.stderr, /invalid_prefab_unsafe_paths\.scene\.json/);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_visual_regression_baseline',
      arguments: {
        path: unsafePrefabPathsSceneMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    assert.equal(mcpResponse.result.structuredContent.ok, false);
    assert.equal(mcpResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(mcpResponse.result.content[0].text, /Scene validation failed for/);
    assert.match(mcpResponse.result.structuredContent.errorMessage, /invalid_prefab_unsafe_paths\.scene\.json/);
  } finally {
    await mcp.close();
  }
});

test('VisualRegressionBaselineReport v1 reports invalid MCP options predictably', async () => {
  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_visual_regression_baseline',
      arguments: {
        path: './scenes/v1-small-2d.scene.json',
        tick: -1
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    assert.match(mcpResponse.result.content[0].text, /`tick` must be an integer >= 0/);
  } finally {
    await mcp.close();
  }
});
