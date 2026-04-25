import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  loadSceneFile,
  buildRenderSnapshotV1,
  renderBrowserPlayableDemoHtmlV1,
  createBrowserPlayableDemoMetadataV1,
  BROWSER_PLAYABLE_DEMO_VERSION
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

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

test('browser playable demo stays aligned across runtime, CLI and MCP for the same scene options', async () => {
  const tick = 4;
  const width = 320;
  const height = 180;
  const scene = await loadSceneFile(tutorialScenePath);
  const snapshot = await buildRenderSnapshotV1(scene, { tick, width, height });
  const runtimeEnvelope = {
    browserDemoVersion: BROWSER_PLAYABLE_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderBrowserPlayableDemoHtmlV1({
      title: `${snapshot.scene} Browser Playable Demo`,
      renderSnapshot: snapshot,
      metadata: createBrowserPlayableDemoMetadataV1(scene, snapshot)
    })
  };

  const cliResult = runCli([
    'render-browser-demo',
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
      name: 'render_browser_demo',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick,
        width,
        height
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assert.deepEqual(Object.keys(runtimeEnvelope).sort(), ['browserDemoVersion', 'html', 'scene', 'tick']);
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.equal(runtimeEnvelope.browserDemoVersion, 1);
    assert.equal(runtimeEnvelope.scene, 'tutorial');
    assert.equal(runtimeEnvelope.tick, 4);
    assert.match(runtimeEnvelope.html, /^<!DOCTYPE html>/);
    assert.match(runtimeEnvelope.html, /<canvas id="browser-playable-demo-canvas"/);
    assert.match(runtimeEnvelope.html, /Click the canvas and use WASD or Arrow Keys to move\./);
    assert.match(runtimeEnvelope.html, /<p id="browser-playable-demo-position" class="hud" aria-live="polite">Position: x 0, y 0<\/p>/);
    assert.match(runtimeEnvelope.html, /<button id="browser-playable-demo-reset" type="button" aria-controls="browser-playable-demo-canvas">Reset position<\/button>/);
    assert.match(runtimeEnvelope.html, /addEventListener\("keydown"/);
    assert.match(runtimeEnvelope.html, /resetButton\.addEventListener\("click"/);
    assert.doesNotMatch(runtimeEnvelope.html, /<script[^>]+src=/);
    assert.doesNotMatch(runtimeEnvelope.html, /<link[^>]+href=/);
    assert.doesNotMatch(runtimeEnvelope.html, /https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|localStorage|requestAnimationFrame|Date\.now|new Date|performance\.now/);
  } finally {
    await mcp.close();
  }
});
