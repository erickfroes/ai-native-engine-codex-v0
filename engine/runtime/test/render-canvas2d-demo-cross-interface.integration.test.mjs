import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildRenderSnapshotV1,
  materializeBrowserDemoAssetSrcV1,
  renderCanvas2DDemoHtmlV1,
  CANVAS_2D_DEMO_VERSION
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const spriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json');
const prefabOnlyScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'prefab-usage-prefab-only.scene.json'
);
const prefabOnlySceneMcpPath = './engine/runtime/test/fixtures/prefab-usage-prefab-only.scene.json';
const portableEmptyVisualScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'portable-empty-visual.scene.json'
);
const portableEmptyVisualSceneMcpPath = './engine/runtime/test/fixtures/portable-empty-visual.scene.json';
const spriteSceneMcpPath = './fixtures/assets/sprite.scene.json';
const missingAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'missing.asset-manifest.json');
const invalidAssetManifestPath = path.join(
  repoRoot,
  'fixtures',
  'assets',
  'invalid.non-positive-size.asset-manifest.json'
);
const invalidTraversalAssetManifestPath = path.join(
  repoRoot,
  'fixtures',
  'assets',
  'invalid.traversal-src.asset-manifest.json'
);
const missingAssetManifestMcpPath = './fixtures/assets/missing.asset-manifest.json';
const invalidAssetManifestMcpPath = './fixtures/assets/invalid.non-positive-size.asset-manifest.json';
const invalidTraversalAssetManifestMcpPath = './fixtures/assets/invalid.traversal-src.asset-manifest.json';
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const visualSpriteAssetManifestMcpPath = './fixtures/assets/visual-sprite.asset-manifest.json';

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

async function initializeMcpClient(client) {
  const initResponse = await client.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });
  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  client.notify('notifications/initialized');
}

test('render-canvas-demo stays aligned across runtime, CLI and MCP for the same scene options', async () => {
  const tick = 4;
  const width = 320;
  const height = 180;
  const snapshot = await buildRenderSnapshotV1(tutorialScenePath, { tick, width, height });
  const runtimeEnvelope = {
    canvasDemoVersion: CANVAS_2D_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderCanvas2DDemoHtmlV1({
      title: `${snapshot.scene} Canvas 2D Demo`,
      renderSnapshot: snapshot,
      metadata: {
        scene: snapshot.scene,
        tick: snapshot.tick,
        viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
      }
    })
  };

  const cliResult = runCli([
    'render-canvas-demo',
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
      name: 'render_canvas_demo',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick,
        width,
        height
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assert.deepEqual(Object.keys(runtimeEnvelope).sort(), ['canvasDemoVersion', 'html', 'scene', 'tick']);
    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
  } finally {
    await mcp.close();
  }
});

test('render-canvas-demo keeps fully inherited prefab-backed sprite loading aligned across runtime, CLI and MCP with assetManifestPath', async () => {
  const rawSnapshot = await buildRenderSnapshotV1(prefabOnlyScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });
  const snapshot = materializeBrowserDemoAssetSrcV1(rawSnapshot, visualSpriteAssetManifestPath);
  const runtimeEnvelope = {
    canvasDemoVersion: CANVAS_2D_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderCanvas2DDemoHtmlV1({
      title: `${snapshot.scene} Canvas 2D Demo`,
      renderSnapshot: snapshot,
      metadata: {
        scene: snapshot.scene,
        tick: snapshot.tick,
        viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
      }
    })
  };

  const cliResult = runCli([
    'render-canvas-demo',
    prefabOnlyScenePath,
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
      name: 'render_canvas_demo',
      arguments: {
        path: prefabOnlySceneMcpPath,
        assetManifestPath: visualSpriteAssetManifestMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.equal(runtimeEnvelope.scene, 'prefab-usage-prefab-only-fixture');
    assert.equal(runtimeEnvelope.tick, 0);
    assert.match(runtimeEnvelope.html, /prefab-usage-prefab-only-fixture Canvas 2D Demo/);
    assert.match(runtimeEnvelope.html, /"kind":"sprite"/);
    assert.match(runtimeEnvelope.html, /"assetId":"player\.sprite"/);
    assert.match(runtimeEnvelope.html, /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/);
    assert.match(runtimeEnvelope.html, /"x":4,"y":3,"width":16,"height":16,"layer":2/);
    assert.match(runtimeEnvelope.html, /const image = new Image\(\);/);
    assert.match(runtimeEnvelope.html, /context\.drawImage\(imageState\.image, drawCall\.x, drawCall\.y, drawCall\.width, drawCall\.height\);/);
  } finally {
    await mcp.close();
  }
});

test('render-canvas-demo keeps empty drawCalls aligned across runtime, CLI and MCP for scenes without visual components', async () => {
  const snapshot = await buildRenderSnapshotV1(portableEmptyVisualScenePath);
  const runtimeEnvelope = {
    canvasDemoVersion: CANVAS_2D_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderCanvas2DDemoHtmlV1({
      title: `${snapshot.scene} Canvas 2D Demo`,
      renderSnapshot: snapshot,
      metadata: {
        scene: snapshot.scene,
        tick: snapshot.tick,
        viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
      }
    })
  };

  const cliResult = runCli([
    'render-canvas-demo',
    portableEmptyVisualScenePath,
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
      name: 'render_canvas_demo',
      arguments: {
        path: portableEmptyVisualSceneMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.equal(runtimeEnvelope.scene, 'portable-empty-visual-fixture');
    assert.equal(runtimeEnvelope.tick, 0);
    assert.match(runtimeEnvelope.html, /portable-empty-visual-fixture Canvas 2D Demo/);
    assert.match(runtimeEnvelope.html, /"drawCalls":\[\]/);
    assert.doesNotMatch(runtimeEnvelope.html, /"kind":"rect"/);
    assert.doesNotMatch(runtimeEnvelope.html, /"kind":"sprite"/);
    assert.doesNotMatch(runtimeEnvelope.html, /"assetId":/);
  } finally {
    await mcp.close();
  }
});

test('render-canvas-demo stays deterministic for the same scene options', () => {
  const args = [
    'render-canvas-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180',
    '--json'
  ];
  const first = runCli(args);
  const second = runCli(args);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
});

test('render-canvas-demo keeps sprite fallback intact across runtime, CLI and MCP without assetManifestPath', async () => {
  const snapshot = await buildRenderSnapshotV1(spriteScenePath);
  const runtimeEnvelope = {
    canvasDemoVersion: CANVAS_2D_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderCanvas2DDemoHtmlV1({
      title: `${snapshot.scene} Canvas 2D Demo`,
      renderSnapshot: snapshot,
      metadata: {
        scene: snapshot.scene,
        tick: snapshot.tick,
        viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
      }
    })
  };

  const cliResult = runCli([
    'render-canvas-demo',
    spriteScenePath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);

  const mcp = createMcpClient();
  try {
    await initializeMcpClient(mcp);

    const mcpResponse = await mcp.request('tools/call', {
      name: 'render_canvas_demo',
      arguments: {
        path: spriteSceneMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;

    assert.deepEqual(runtimeEnvelope, cliEnvelope);
    assert.deepEqual(runtimeEnvelope, mcpEnvelope);
    assert.match(runtimeEnvelope.html, /"kind":"rect"/);
    assert.doesNotMatch(runtimeEnvelope.html, /"kind":"sprite"/);
    assert.doesNotMatch(runtimeEnvelope.html, /file:\/\/\//);
    assert.doesNotMatch(runtimeEnvelope.html, /drawImage/);
  } finally {
    await mcp.close();
  }
});

test('render-canvas-demo reports missing asset manifest predictably across runtime, CLI and MCP', async () => {
  await assert.rejects(
    buildRenderSnapshotV1(spriteScenePath, { assetManifestPath: missingAssetManifestPath }),
    /ENOENT: no such file or directory/
  );

  const cliResult = runCli([
    'render-canvas-demo',
    spriteScenePath,
    '--asset-manifest',
    missingAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /ENOENT: no such file or directory/);
  assert.match(cliResult.stderr, /missing\.asset-manifest\.json/);

  const mcp = createMcpClient();
  try {
    await initializeMcpClient(mcp);

    const mcpResponse = await mcp.request('tools/call', {
      name: 'render_canvas_demo',
      arguments: {
        path: spriteSceneMcpPath,
        assetManifestPath: missingAssetManifestMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    assert.equal(mcpResponse.result.structuredContent.ok, false);
    assert.equal(mcpResponse.result.structuredContent.errorName, 'Error');
    assert.match(mcpResponse.result.content[0].text, /ENOENT: no such file or directory/);
    assert.match(mcpResponse.result.structuredContent.errorMessage, /missing\.asset-manifest\.json/);
  } finally {
    await mcp.close();
  }
});

test('render-canvas-demo reports invalid asset manifest predictably across runtime, CLI and MCP', async () => {
  await assert.rejects(
    buildRenderSnapshotV1(spriteScenePath, { assetManifestPath: invalidAssetManifestPath }),
    (error) => {
      assert.equal(error.name, 'AssetManifestValidationError');
      assert.match(error.message, /\$\.assets\[0\]\.width: must be >= 1/);
      assert.match(error.message, /\$\.assets\[0\]\.height: must be >= 1/);
      return true;
    }
  );

  const cliResult = runCli([
    'render-canvas-demo',
    spriteScenePath,
    '--asset-manifest',
    invalidAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /AssetManifestValidationError: asset manifest is invalid:/);
  assert.match(cliResult.stderr, /\$\.assets\[0\]\.width: must be >= 1/);
  assert.match(cliResult.stderr, /\$\.assets\[0\]\.height: must be >= 1/);

  const mcp = createMcpClient();
  try {
    await initializeMcpClient(mcp);

    const mcpResponse = await mcp.request('tools/call', {
      name: 'render_canvas_demo',
      arguments: {
        path: spriteSceneMcpPath,
        assetManifestPath: invalidAssetManifestMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    assert.equal(mcpResponse.result.structuredContent.ok, false);
    assert.equal(mcpResponse.result.structuredContent.errorName, 'AssetManifestValidationError');
    assert.match(mcpResponse.result.content[0].text, /asset manifest is invalid:/);
    assert.match(mcpResponse.result.structuredContent.errorMessage, /\$\.assets\[0\]\.width: must be >= 1/);
    assert.match(mcpResponse.result.structuredContent.errorMessage, /\$\.assets\[0\]\.height: must be >= 1/);
  } finally {
    await mcp.close();
  }
});

test('render-canvas-demo reports manifest traversal predictably across runtime, CLI and MCP', async () => {
  await assert.rejects(
    buildRenderSnapshotV1(spriteScenePath, { assetManifestPath: invalidTraversalAssetManifestPath }),
    (error) => {
      assert.equal(error.name, 'AssetManifestValidationError');
      assert.match(error.message, /\$\.assets\[0\]\.src: must stay inside the manifest directory/);
      return true;
    }
  );

  const cliResult = runCli([
    'render-canvas-demo',
    spriteScenePath,
    '--asset-manifest',
    invalidTraversalAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /AssetManifestValidationError: asset manifest is invalid:/);
  assert.match(cliResult.stderr, /\$\.assets\[0\]\.src: must stay inside the manifest directory/);

  const mcp = createMcpClient();
  try {
    await initializeMcpClient(mcp);

    const mcpResponse = await mcp.request('tools/call', {
      name: 'render_canvas_demo',
      arguments: {
        path: spriteSceneMcpPath,
        assetManifestPath: invalidTraversalAssetManifestMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    assert.equal(mcpResponse.result.structuredContent.ok, false);
    assert.equal(mcpResponse.result.structuredContent.errorName, 'AssetManifestValidationError');
    assert.match(mcpResponse.result.content[0].text, /asset manifest is invalid:/);
    assert.match(
      mcpResponse.result.structuredContent.errorMessage,
      /\$\.assets\[0\]\.src: must stay inside the manifest directory/
    );
  } finally {
    await mcp.close();
  }
});
