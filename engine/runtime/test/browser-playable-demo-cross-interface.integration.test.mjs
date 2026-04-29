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
  materializeBrowserDemoAssetSrcV1,
  BROWSER_PLAYABLE_DEMO_VERSION
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const v1Small2dScenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const spriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json');
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const tileLayerScenePath = path.join(repoRoot, 'fixtures', 'tile-layer.scene.json');
const movementBlockingTileBlockedScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-tile-blocked.scene.json'
);
const movementBlockingTileOpenScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-tile-open.scene.json'
);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function assertBrowserDemoEnvelope(payload, {
  expectedScene = 'tutorial',
  expectedTick = 4,
  withAssetLoading = false,
  expectedAssetSrcPatterns = [
    /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/,
    /"assetSrc":"file:\/\/\/[^"]+images\/camera-icon\.png"/
  ]
} = {}) {
  assert.deepEqual(Object.keys(payload), ['browserDemoVersion', 'scene', 'tick', 'html']);
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, expectedScene);
  assert.equal(payload.tick, expectedTick);
  assert.equal('outputPath' in payload, false);
  assert.match(payload.html, /^<!DOCTYPE html>/);
  assert.match(payload.html, /<canvas id="browser-playable-demo-canvas"/);
  assert.match(payload.html, /tabindex="0"/);
  assert.match(payload.html, /aria-label="Browser playable demo canvas"/);
  if (withAssetLoading) {
    assert.match(payload.html, /new Image\(\)/);
    assert.match(payload.html, /drawImage\(/);
    assert.match(payload.html, /assetSrc/);
    for (const expectedAssetSrcPattern of expectedAssetSrcPatterns) {
      assert.match(payload.html, expectedAssetSrcPattern);
    }
  }
  assert.match(payload.html, /requestAnimationFrame\(renderFrame\)/);
  assert.match(payload.html, />Pause rendering<\/button>/);
  assert.match(payload.html, /Resume rendering/);
  assert.match(payload.html, />Reset position<\/button>/);
  assert.match(
    payload.html,
    /Click the canvas, then use Arrow Keys or WASD to move the highlighted rectangle by 4 px per keydown\./
  );
  assert.match(payload.html, /addEventListener\("keydown"/);
  assert.doesNotMatch(
    payload.html,
    /<script[^>]+src=|https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|Date\.now|new Date|performance\.now|localStorage/
  );
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

    assertBrowserDemoEnvelope(runtimeEnvelope);
    assertBrowserDemoEnvelope(cliEnvelope);
    assertBrowserDemoEnvelope(mcpEnvelope);
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.equal(runtimeEnvelope.html, cliEnvelope.html);
    assert.equal(runtimeEnvelope.html, mcpEnvelope.html);
  } finally {
    await mcp.close();
  }
});

test('browser playable demo with asset manifest stays aligned across runtime, CLI and MCP', async () => {
  const tick = 4;
  const width = 64;
  const height = 48;
  const scene = await loadSceneFile(spriteScenePath);
  const snapshot = materializeBrowserDemoAssetSrcV1(await buildRenderSnapshotV1(scene, {
    tick,
    width,
    height,
    assetManifestPath: validAssetManifestPath
  }), validAssetManifestPath);

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
    spriteScenePath,
    '--tick',
    String(tick),
    '--width',
    String(width),
    '--height',
    String(height),
    '--asset-manifest',
    validAssetManifestPath,
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
        path: './fixtures/assets/sprite.scene.json',
        tick,
        width,
        height,
        assetManifestPath: './fixtures/assets/valid.asset-manifest.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assertBrowserDemoEnvelope(runtimeEnvelope, {
      expectedScene: 'sprite-fixture',
      expectedTick: 4,
      withAssetLoading: true
    });
    assertBrowserDemoEnvelope(cliEnvelope, {
      expectedScene: 'sprite-fixture',
      expectedTick: 4,
      withAssetLoading: true
    });
    assertBrowserDemoEnvelope(mcpEnvelope, {
      expectedScene: 'sprite-fixture',
      expectedTick: 4,
      withAssetLoading: true
    });
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.equal(runtimeEnvelope.html, cliEnvelope.html);
    assert.equal(runtimeEnvelope.html, mcpEnvelope.html);
  } finally {
    await mcp.close();
  }
});

test('browser playable demo with visual.sprite and asset manifest stays aligned across runtime, CLI and MCP', async () => {
  const tick = 4;
  const width = 64;
  const height = 48;
  const scene = await loadSceneFile(visualSpriteScenePath);
  const snapshot = materializeBrowserDemoAssetSrcV1(await buildRenderSnapshotV1(scene, {
    tick,
    width,
    height,
    assetManifestPath: visualSpriteAssetManifestPath
  }), visualSpriteAssetManifestPath);

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
    visualSpriteScenePath,
    '--tick',
    String(tick),
    '--width',
    String(width),
    '--height',
    String(height),
    '--asset-manifest',
    visualSpriteAssetManifestPath,
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
        path: './fixtures/assets/visual-sprite.scene.json',
        tick,
        width,
        height,
        assetManifestPath: './fixtures/assets/visual-sprite.asset-manifest.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;
    const visualSpriteAssetSrcPatterns = [
      /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/
    ];

    assertBrowserDemoEnvelope(runtimeEnvelope, {
      expectedScene: 'visual-sprite-fixture',
      expectedTick: 4,
      withAssetLoading: true,
      expectedAssetSrcPatterns: visualSpriteAssetSrcPatterns
    });
    assertBrowserDemoEnvelope(cliEnvelope, {
      expectedScene: 'visual-sprite-fixture',
      expectedTick: 4,
      withAssetLoading: true,
      expectedAssetSrcPatterns: visualSpriteAssetSrcPatterns
    });
    assertBrowserDemoEnvelope(mcpEnvelope, {
      expectedScene: 'visual-sprite-fixture',
      expectedTick: 4,
      withAssetLoading: true,
      expectedAssetSrcPatterns: visualSpriteAssetSrcPatterns
    });
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.equal(runtimeEnvelope.html, cliEnvelope.html);
    assert.equal(runtimeEnvelope.html, mcpEnvelope.html);
  } finally {
    await mcp.close();
  }
});

test('browser playable demo with tile.layer stays aligned across runtime, CLI and MCP', async () => {
  const scene = await loadSceneFile(tileLayerScenePath);
  const snapshot = await buildRenderSnapshotV1(scene);
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
      name: 'render_browser_demo',
      arguments: {
        path: './fixtures/tile-layer.scene.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assertBrowserDemoEnvelope(runtimeEnvelope, {
      expectedScene: 'tile-layer-fixture',
      expectedTick: 0
    });
    assertBrowserDemoEnvelope(cliEnvelope, {
      expectedScene: 'tile-layer-fixture',
      expectedTick: 0
    });
    assertBrowserDemoEnvelope(mcpEnvelope, {
      expectedScene: 'tile-layer-fixture',
      expectedTick: 0
    });
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.match(runtimeEnvelope.html, /data-controllable-entity="map\.ground\.tile\.0\.0"/);
    assert.match(runtimeEnvelope.html, /"id":"map\.ground\.tile\.0\.0"/);
    assert.match(runtimeEnvelope.html, /"id":"map\.ground\.tile\.2\.3"/);
    assert.match(runtimeEnvelope.html, /fillRect\(/);
    assert.match(runtimeEnvelope.html, /strokeRect\(/);
    assert.doesNotMatch(runtimeEnvelope.html, /fetch\(|XMLHttpRequest|WebSocket|<script[^>]+src=|<link[^>]+href=/);
  } finally {
    await mcp.close();
  }
});

test('browser playable demo movementBlocking stays aligned across runtime, CLI and MCP', async () => {
  const testCases = [
    {
      scenePath: movementBlockingTileBlockedScenePath,
      mcpPath: './engine/runtime/test/fixtures/movement-blocking-tile-blocked.scene.json',
      expectedScene: 'movement-blocking-tile-blocked-fixture',
      expectedTileId: 'map.walls.tile.0.1'
    },
    {
      scenePath: movementBlockingTileOpenScenePath,
      mcpPath: './engine/runtime/test/fixtures/movement-blocking-tile-open.scene.json',
      expectedScene: 'movement-blocking-tile-open-fixture',
      expectedTileId: 'map.walls.tile.0.2'
    }
  ];

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    for (const testCase of testCases) {
      const scene = await loadSceneFile(testCase.scenePath);
      const snapshot = await buildRenderSnapshotV1(scene);
      const runtimeEnvelope = {
        browserDemoVersion: BROWSER_PLAYABLE_DEMO_VERSION,
        scene: snapshot.scene,
        tick: snapshot.tick,
        html: renderBrowserPlayableDemoHtmlV1({
          title: `${snapshot.scene} Browser Playable Demo`,
          renderSnapshot: snapshot,
          metadata: createBrowserPlayableDemoMetadataV1(scene, snapshot, { movementBlocking: true })
        })
      };

      const cliResult = runCli([
        'render-browser-demo',
        testCase.scenePath,
        '--movement-blocking',
        '--json'
      ]);

      assert.equal(cliResult.status, 0, cliResult.stderr);
      const cliEnvelope = JSON.parse(cliResult.stdout);

      const mcpResponse = await mcp.request('tools/call', {
        name: 'render_browser_demo',
        arguments: {
          path: testCase.mcpPath,
          movementBlocking: true
        }
      });

      assert.equal(mcpResponse.result.isError, false);
      const mcpEnvelope = mcpResponse.result.structuredContent;

      assertBrowserDemoEnvelope(runtimeEnvelope, {
        expectedScene: testCase.expectedScene,
        expectedTick: 0
      });
      assertBrowserDemoEnvelope(cliEnvelope, {
        expectedScene: testCase.expectedScene,
        expectedTick: 0
      });
      assertBrowserDemoEnvelope(mcpEnvelope, {
        expectedScene: testCase.expectedScene,
        expectedTick: 0
      });
      assert.deepEqual(runtimeEnvelope, cliEnvelope);
      assert.deepEqual(runtimeEnvelope, mcpEnvelope);
      assert.match(runtimeEnvelope.html, /"movementBlocking":/);
      assert.match(runtimeEnvelope.html, new RegExp(`"id":"${testCase.expectedTileId.replaceAll('.', '\\.')}"`));
    }
  } finally {
    await mcp.close();
  }
});

test('browser gameplay HUD lite stays opt-in and aligned across runtime, CLI and MCP', async () => {
  const scene = await loadSceneFile(v1Small2dScenePath);
  const snapshot = await buildRenderSnapshotV1(scene);
  const runtimeEnvelope = {
    browserDemoVersion: BROWSER_PLAYABLE_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderBrowserPlayableDemoHtmlV1({
      title: `${snapshot.scene} Browser Playable Demo`,
      renderSnapshot: snapshot,
      metadata: createBrowserPlayableDemoMetadataV1(scene, snapshot, {
        gameplayHud: true,
        movementBlocking: true
      })
    })
  };

  const cliResult = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--gameplay-hud',
    '--movement-blocking',
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);

  const defaultCliResult = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--json'
  ]);

  assert.equal(defaultCliResult.status, 0, defaultCliResult.stderr);
  const defaultCliEnvelope = JSON.parse(defaultCliResult.stdout);

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
        path: './scenes/v1-small-2d.scene.json',
        gameplayHud: true,
        movementBlocking: true
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assertBrowserDemoEnvelope(runtimeEnvelope, {
      expectedScene: 'v1-small-2d',
      expectedTick: 0
    });
    assertBrowserDemoEnvelope(cliEnvelope, {
      expectedScene: 'v1-small-2d',
      expectedTick: 0
    });
    assertBrowserDemoEnvelope(mcpEnvelope, {
      expectedScene: 'v1-small-2d',
      expectedTick: 0
    });
    assertBrowserDemoEnvelope(defaultCliEnvelope, {
      expectedScene: 'v1-small-2d',
      expectedTick: 0
    });
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.match(runtimeEnvelope.html, /"gameplayHud":\{"enabled":true,"movementBlockingEnabled":true,"snapshotTick":0\}/);
    assert.match(runtimeEnvelope.html, /id="browser-gameplay-hud"/);
    assert.match(runtimeEnvelope.html, /"movementBlocking":/);
    assert.match(runtimeEnvelope.html, /"id":"map\.ground\.tile\.2\.3"/);
    assert.doesNotMatch(defaultCliEnvelope.html, /"gameplayHud":/);
    assert.doesNotMatch(defaultCliEnvelope.html, /browser-gameplay-hud/);
  } finally {
    await mcp.close();
  }
});
