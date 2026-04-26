import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, renderSnapshotToSvgV1, RENDER_SVG_VERSION } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const tileLayerScenePath = path.join(repoRoot, 'fixtures', 'tile-layer.scene.json');

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

test('Render SVG v1 stays semantically aligned across runtime, CLI and MCP', async () => {
  const tick = 4;
  const width = 320;
  const height = 180;
  const snapshot = await buildRenderSnapshotV1(tutorialScenePath, { tick, width, height });
  const runtimeEnvelope = {
    svgVersion: RENDER_SVG_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    svg: renderSnapshotToSvgV1(snapshot)
  };

  const cliResult = runCli([
    'render-svg',
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
  const cliEnvelope = JSON.parse(cliResult.stdout);

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
      name: 'render_svg',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick,
        width,
        height
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assert.deepEqual(Object.keys(runtimeEnvelope).sort(), ['scene', 'svg', 'svgVersion', 'tick']);
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
  } finally {
    await mcp.close();
  }
});

test('Render SVG v1 with tile.layer stays aligned across runtime, CLI and MCP', async () => {
  const snapshot = await buildRenderSnapshotV1(tileLayerScenePath);
  const runtimeEnvelope = {
    svgVersion: RENDER_SVG_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    svg: renderSnapshotToSvgV1(snapshot)
  };

  const cliResult = runCli([
    'render-svg',
    tileLayerScenePath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);

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
      name: 'render_svg',
      arguments: {
        path: './fixtures/tile-layer.scene.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.match(runtimeEnvelope.svg, /id="map\.ground\.tile\.0\.0"/);
    assert.match(runtimeEnvelope.svg, /id="map\.ground\.tile\.1\.3"/);
    assert.match(runtimeEnvelope.svg, /id="map\.ground\.tile\.2\.3"/);
  } finally {
    await mcp.close();
  }
});
