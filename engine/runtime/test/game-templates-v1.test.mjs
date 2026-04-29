import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildMovementBlockingReportV1,
  buildRenderSnapshotV1,
  loadSceneFile,
  loadValidatedInputIntentV1,
  sha256Hex
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');

const templates = [
  {
    id: 'top-down-basic',
    scene: 'template-top-down-basic',
    scenePath: path.join(repoRoot, 'templates', 'top-down-basic', 'scene.json'),
    sceneMcpPath: './templates/top-down-basic/scene.json',
    blockedIntentPath: path.join(repoRoot, 'templates', 'top-down-basic', 'input', 'move-right.intent.json'),
    blockedIntentMcpPath: './templates/top-down-basic/input/move-right.intent.json',
    openIntentPath: path.join(repoRoot, 'templates', 'top-down-basic', 'input', 'move-down.intent.json'),
    openIntentMcpPath: './templates/top-down-basic/input/move-down.intent.json',
    blockedBy: 'map.room.tile.2.3',
    maxDrawCalls: 64,
    maxSolidTileBlockers: 32,
    maxExportSizeBytes: 32000
  },
  {
    id: 'side-view-blocking-basic',
    scene: 'template-side-view-blocking-basic',
    scenePath: path.join(repoRoot, 'templates', 'side-view-blocking-basic', 'scene.json'),
    sceneMcpPath: './templates/side-view-blocking-basic/scene.json',
    blockedIntentPath: path.join(repoRoot, 'templates', 'side-view-blocking-basic', 'input', 'move-right.intent.json'),
    blockedIntentMcpPath: './templates/side-view-blocking-basic/input/move-right.intent.json',
    openIntentPath: path.join(repoRoot, 'templates', 'side-view-blocking-basic', 'input', 'move-down.intent.json'),
    openIntentMcpPath: './templates/side-view-blocking-basic/input/move-down.intent.json',
    blockedBy: 'map.stage.tile.2.3',
    maxDrawCalls: 32,
    maxSolidTileBlockers: 16,
    maxExportSizeBytes: 32000
  }
];

async function discoverTemplateIds() {
  const entries = await readdir(path.join(repoRoot, 'templates'), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

async function createRepoTempDir(t) {
  const directory = await mkdtemp(path.join(repoRoot, '.tmp-game-templates-v1-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

function assertNoForbiddenHtmlSurface(html) {
  assert.doesNotMatch(
    html,
    /<script[^>]+src=|<link[^>]+href=|https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|EventSource|import\(|Date\.now|new Date|performance\.now|localStorage|sessionStorage|IndexedDB|indexedDB/
  );
}

function assertBrowserDemoEnvelope(envelope, scene) {
  assert.deepEqual(Object.keys(envelope).sort(), ['browserDemoVersion', 'html', 'scene', 'tick']);
  assert.equal(envelope.browserDemoVersion, 1);
  assert.equal(envelope.scene, scene);
  assert.equal(envelope.tick, 0);
  assert.match(envelope.html, /^<!DOCTYPE html>/);
  assert.match(envelope.html, /<canvas id="browser-playable-demo-canvas"/);
  assertNoForbiddenHtmlSurface(envelope.html);
}

function assertExportEnvelope(envelope, scene, options) {
  assert.deepEqual(Object.keys(envelope), [
    'exportVersion',
    'scene',
    'outputPath',
    'options',
    'sizeBytes',
    'htmlHash'
  ]);
  assert.equal(envelope.exportVersion, 1);
  assert.equal(envelope.scene, scene);
  assert.deepEqual(envelope.options, options);
  assert.equal(Number.isInteger(envelope.sizeBytes), true);
  assert.match(envelope.htmlHash, /^[a-f0-9]{64}$/);
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
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    }
  });

  child.stderr.resume();

  function request(method, params) {
    const id = nextId++;
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })}\n`);
    return new Promise((resolve) => pending.set(id, resolve));
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

async function initializeMcp(client) {
  const initResponse = await client.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });
  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  client.notify('notifications/initialized');
}

test('Game Templates v1 directories expose the expected copy-and-adapt package shape', async () => {
  assert.deepEqual(await discoverTemplateIds(), templates.map((template) => template.id).sort());

  for (const template of templates) {
    await access(template.scenePath);
    await access(path.join(repoRoot, 'templates', template.id, 'README.md'));
    await access(template.blockedIntentPath);
    await access(template.openIntentPath);
    await loadSceneFile(template.scenePath);
    await loadValidatedInputIntentV1(template.blockedIntentPath);
    await loadValidatedInputIntentV1(template.openIntentPath);
  }
});

test('Game Templates v1 scenes validate and keep deterministic render and movement reports', async () => {
  for (const template of templates) {
    const scene = await loadSceneFile(template.scenePath);
    const blockedIntent = await loadValidatedInputIntentV1(template.blockedIntentPath);
    const openIntent = await loadValidatedInputIntentV1(template.openIntentPath);
    const snapshot = await buildRenderSnapshotV1(scene);
    const repeatedSnapshot = await buildRenderSnapshotV1(template.scenePath);
    const blocked = await buildMovementBlockingReportV1(scene, { inputIntent: blockedIntent });
    const open = await buildMovementBlockingReportV1(template.scenePath, { inputIntent: openIntent });
    const cliValidation = runCli(['validate-scene', template.scenePath, '--json']);
    const cliSnapshot = runCli(['render-snapshot', template.scenePath, '--json']);

    assert.equal(cliValidation.status, 0, cliValidation.stderr);
    assert.equal(cliSnapshot.status, 0, cliSnapshot.stderr);
    assert.equal(JSON.parse(cliValidation.stdout).valid, true);
    assert.deepEqual(snapshot, repeatedSnapshot);
    assert.deepEqual(snapshot, JSON.parse(cliSnapshot.stdout));
    assert.equal(snapshot.scene, template.scene);
    assert.equal(snapshot.drawCalls.some((drawCall) => drawCall.id === 'player.hero'), true);
    assert.equal(snapshot.drawCalls.some((drawCall) => drawCall.id === template.blockedBy), true);
    assert.ok(snapshot.drawCalls.length <= template.maxDrawCalls);
    assert.equal(blocked.blocked, true);
    assert.deepEqual(blocked.blockingEntities, [template.blockedBy]);
    assert.equal(open.blocked, false);
    assert.deepEqual(open.blockingEntities, []);

    const solidTiles = runCli(['inspect-tile-collision', template.scenePath, '--json']);
    assert.equal(solidTiles.status, 0, solidTiles.stderr);
    assert.ok(JSON.parse(solidTiles.stdout).tiles.length <= template.maxSolidTileBlockers);
  }
});

test('Game Templates v1 Browser Demo CLI supports default and full opt-in modes', () => {
  for (const template of templates) {
    const defaultResult = runCli(['render-browser-demo', template.scenePath, '--json']);
    const fullResult = runCli([
      'render-browser-demo',
      template.scenePath,
      '--movement-blocking',
      '--gameplay-hud',
      '--playable-save-load',
      '--json'
    ]);

    assert.equal(defaultResult.status, 0, defaultResult.stderr);
    assert.equal(fullResult.status, 0, fullResult.stderr);
    const defaultEnvelope = JSON.parse(defaultResult.stdout);
    const fullEnvelope = JSON.parse(fullResult.stdout);
    assertBrowserDemoEnvelope(defaultEnvelope, template.scene);
    assertBrowserDemoEnvelope(fullEnvelope, template.scene);
    assert.doesNotMatch(defaultEnvelope.html, /"movementBlocking":/);
    assert.doesNotMatch(defaultEnvelope.html, /"gameplayHud":/);
    assert.doesNotMatch(defaultEnvelope.html, /"playableSaveLoad":/);
    assert.match(fullEnvelope.html, /"movementBlocking":/);
    assert.match(fullEnvelope.html, /id="browser-gameplay-hud"/);
    assert.match(fullEnvelope.html, /id="browser-playable-save-load"/);
    assert.match(fullEnvelope.html, new RegExp(template.blockedBy.replaceAll('.', '\\.')));
  }
});

test('Game Templates v1 export-html-game writes deterministic HTML for default and full opt-in modes', async (t) => {
  const tempDir = await createRepoTempDir(t);

  for (const template of templates) {
    const defaultOut = path.join(tempDir, `${template.id}.html`);
    const fullOut = path.join(tempDir, `${template.id}-full.html`);
    const defaultResult = runCli(['export-html-game', template.scenePath, '--out', defaultOut, '--json']);
    const repeatedDefaultResult = runCli(['export-html-game', template.scenePath, '--out', defaultOut, '--json']);
    const fullResult = runCli([
      'export-html-game',
      template.scenePath,
      '--out',
      fullOut,
      '--movement-blocking',
      '--gameplay-hud',
      '--playable-save-load',
      '--json'
    ]);

    assert.equal(defaultResult.status, 0, defaultResult.stderr);
    assert.equal(repeatedDefaultResult.status, 0, repeatedDefaultResult.stderr);
    assert.equal(fullResult.status, 0, fullResult.stderr);

    const defaultEnvelope = JSON.parse(defaultResult.stdout);
    const repeatedDefaultEnvelope = JSON.parse(repeatedDefaultResult.stdout);
    const fullEnvelope = JSON.parse(fullResult.stdout);
    assertExportEnvelope(defaultEnvelope, template.scene, {
      movementBlocking: false,
      gameplayHud: false,
      playableSaveLoad: false,
      audioLite: false
    });
    assertExportEnvelope(fullEnvelope, template.scene, {
      movementBlocking: true,
      gameplayHud: true,
      playableSaveLoad: true,
      audioLite: false
    });
    assert.deepEqual(defaultEnvelope, repeatedDefaultEnvelope);

    const defaultHtml = await readFile(defaultEnvelope.outputPath, 'utf8');
    const fullHtml = await readFile(fullEnvelope.outputPath, 'utf8');
    assert.equal(defaultEnvelope.sizeBytes, Buffer.byteLength(defaultHtml, 'utf8'));
    assert.equal(defaultEnvelope.htmlHash, sha256Hex(defaultHtml));
    assert.equal(fullEnvelope.sizeBytes, Buffer.byteLength(fullHtml, 'utf8'));
    assert.equal(fullEnvelope.htmlHash, sha256Hex(fullHtml));
    assert.ok(defaultEnvelope.sizeBytes <= template.maxExportSizeBytes);
    assert.ok(fullEnvelope.sizeBytes <= template.maxExportSizeBytes);
    assertNoForbiddenHtmlSurface(defaultHtml);
    assertNoForbiddenHtmlSurface(fullHtml);
    assert.doesNotMatch(defaultHtml, /"movementBlocking":/);
    assert.doesNotMatch(defaultHtml, /"gameplayHud":/);
    assert.doesNotMatch(defaultHtml, /"playableSaveLoad":/);
    assert.match(fullHtml, /"movementBlocking":/);
    assert.match(fullHtml, /id="browser-gameplay-hud"/);
    assert.match(fullHtml, /id="browser-playable-save-load"/);
  }
});

test('Game Templates v1 stay aligned across MCP render and export tools', async (t) => {
  const tempDir = await createRepoTempDir(t);
  const client = createMcpClient();

  try {
    await initializeMcp(client);

    for (const template of templates) {
      const validation = await client.request('tools/call', {
        name: 'validate_scene',
        arguments: { path: template.sceneMcpPath }
      });
      const browserDemo = await client.request('tools/call', {
        name: 'render_browser_demo',
        arguments: {
          path: template.sceneMcpPath,
          movementBlocking: true,
          gameplayHud: true,
          playableSaveLoad: true
        }
      });
      const blocked = await client.request('tools/call', {
        name: 'inspect_movement_blocking',
        arguments: {
          path: template.sceneMcpPath,
          inputIntentPath: template.blockedIntentMcpPath
        }
      });
      const open = await client.request('tools/call', {
        name: 'inspect_movement_blocking',
        arguments: {
          path: template.sceneMcpPath,
          inputIntentPath: template.openIntentMcpPath
        }
      });
      const outputPath = path.relative(repoRoot, path.join(tempDir, `${template.id}-mcp.html`));
      const exportResponse = await client.request('tools/call', {
        name: 'export_html_game',
        arguments: {
          scenePath: template.sceneMcpPath,
          outputPath,
          movementBlocking: true,
          gameplayHud: true,
          playableSaveLoad: true
        }
      });

      assert.equal(validation.result.isError, false);
      assert.equal(validation.result.structuredContent.valid, true);
      assert.equal(browserDemo.result.isError, false);
      assertBrowserDemoEnvelope(browserDemo.result.structuredContent, template.scene);
      assert.match(browserDemo.result.structuredContent.html, /id="browser-gameplay-hud"/);
      assert.equal(blocked.result.isError, false);
      assert.equal(open.result.isError, false);
      assert.equal(blocked.result.structuredContent.blocked, true);
      assert.deepEqual(blocked.result.structuredContent.blockingEntities, [template.blockedBy]);
      assert.equal(open.result.structuredContent.blocked, false);
      assert.equal(exportResponse.result.isError, false);
      assertExportEnvelope(exportResponse.result.structuredContent, template.scene, {
        movementBlocking: true,
        gameplayHud: true,
        playableSaveLoad: true,
        audioLite: false
      });

      const exportedHtml = await readFile(exportResponse.result.structuredContent.outputPath, 'utf8');
      assertNoForbiddenHtmlSurface(exportedHtml);
      assert.equal(exportResponse.result.structuredContent.htmlHash, sha256Hex(exportedHtml));
    }
  } finally {
    await client.close();
  }
});
