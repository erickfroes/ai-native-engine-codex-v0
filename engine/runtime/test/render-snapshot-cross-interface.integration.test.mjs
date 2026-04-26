import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1 } from '../src/index.mjs';
import { assertRenderSnapshotV1 } from './helpers/assertRenderSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const spriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json');
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');

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

test('RenderSnapshot v1 stays semantically aligned across runtime, CLI and MCP', async () => {
  const tick = 4;
  const width = 320;
  const height = 180;

  const runtimeSnapshot = await buildRenderSnapshotV1(tutorialScenePath, { tick, width, height });
  assertRenderSnapshotV1(runtimeSnapshot);

  const cliResult = runCli([
    'render-snapshot',
    tutorialScenePath,
    '--tick',
    String(tick),
    '--width',
    String(width),
    '--height',
    String(height),
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliSnapshot = JSON.parse(cliResult.stdout);
  assertRenderSnapshotV1(cliSnapshot);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick,
        width,
        height
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpSnapshot = mcpResponse.result.structuredContent;
    assertRenderSnapshotV1(mcpSnapshot);

    assert.deepEqual(runtimeSnapshot, cliSnapshot);
    assert.deepEqual(runtimeSnapshot, mcpSnapshot);
  } finally {
    await mcp.close();
  }
});

test('RenderSnapshot v1 with asset manifest stays semantically aligned across runtime, CLI and MCP', async () => {
  const runtimeSnapshot = await buildRenderSnapshotV1(spriteScenePath, {
    assetManifestPath: validAssetManifestPath
  });
  assertRenderSnapshotV1(runtimeSnapshot);

  const cliResult = runCli([
    'render-snapshot',
    spriteScenePath,
    '--asset-manifest',
    validAssetManifestPath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliSnapshot = JSON.parse(cliResult.stdout);
  assertRenderSnapshotV1(cliSnapshot);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/valid.asset-manifest.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpSnapshot = mcpResponse.result.structuredContent;
    assertRenderSnapshotV1(mcpSnapshot);

    assert.deepEqual(runtimeSnapshot, cliSnapshot);
    assert.deepEqual(runtimeSnapshot, mcpSnapshot);
  } finally {
    await mcp.close();
  }
});

test('RenderSnapshot v1 with visual.sprite and asset manifest stays aligned across runtime, CLI and MCP', async () => {
  const runtimeSnapshot = await buildRenderSnapshotV1(visualSpriteScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });
  assertRenderSnapshotV1(runtimeSnapshot);

  const cliResult = runCli([
    'render-snapshot',
    visualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliSnapshot = JSON.parse(cliResult.stdout);
  assertRenderSnapshotV1(cliSnapshot);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/assets/visual-sprite.scene.json',
        assetManifestPath: './fixtures/assets/visual-sprite.asset-manifest.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpSnapshot = mcpResponse.result.structuredContent;
    assertRenderSnapshotV1(mcpSnapshot);

    assert.deepEqual(runtimeSnapshot, cliSnapshot);
    assert.deepEqual(runtimeSnapshot, mcpSnapshot);
    assert.deepEqual(runtimeSnapshot.drawCalls, [
      {
        kind: 'sprite',
        id: 'player.hero',
        assetId: 'player.sprite',
        assetSrc: 'images/player.png',
        x: 10,
        y: 12,
        width: 20,
        height: 24,
        layer: 2
      }
    ]);
  } finally {
    await mcp.close();
  }
});
