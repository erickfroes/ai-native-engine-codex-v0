import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildHtmlGameExportV1,
  exportHtmlGameV1,
  sha256Hex,
  SIMPLE_HTML_EXPORT_VERSION
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const UI_SYSTEM_EXPORT_DELTA_BUDGET_BYTES = 5 * 1024;
const scenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const sceneMcpPath = './scenes/v1-small-2d.scene.json';
const portableEmptyVisualScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'portable-empty-visual.scene.json'
);
const portableEmptyVisualSceneMcpPath = './engine/runtime/test/fixtures/portable-empty-visual.scene.json';
const uiActionSemanticsScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const uiProductionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const uiProductionSceneMcpPath = './scenes/ui-production-screens.scene.json';
const prefabOnlyScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'prefab-usage-prefab-only.scene.json');
const prefabOnlySceneMcpPath = './engine/runtime/test/fixtures/prefab-usage-prefab-only.scene.json';
const unsafePrefabPathsScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_prefab_unsafe_paths.scene.json'
);
const unsafePrefabPathsSceneMcpPath = './engine/runtime/test/fixtures/invalid_prefab_unsafe_paths.scene.json';
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const visualSpriteAssetManifestMcpPath = './fixtures/assets/visual-sprite.asset-manifest.json';

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

async function createTempDir(t, prefix = 'simple-html-export-') {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

async function createRepoTempDir(t) {
  const directory = await mkdtemp(path.join(repoRoot, '.tmp-simple-html-export-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

function assertNoForbiddenExportHtmlSurface(html) {
  assert.doesNotMatch(
    html,
    /<script[^>]+src=|<link[^>]+href=|https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|EventSource|import\(|Date\.now|new Date|performance\.now|localStorage|sessionStorage|IndexedDB|indexedDB/
  );
}

function assertExportEnvelopeShape(envelope, { expectedScene = 'v1-small-2d' } = {}) {
  assert.deepEqual(Object.keys(envelope), [
    'exportVersion',
    'scene',
    'outputPath',
    'options',
    'sizeBytes',
    'htmlHash'
  ]);
  assert.equal(envelope.exportVersion, SIMPLE_HTML_EXPORT_VERSION);
  assert.equal(envelope.scene, expectedScene);
  assert.deepEqual(Object.keys(envelope.options), [
    'movementBlocking',
    'gameplayHud',
    'playableSaveLoad',
    'audioLite',
    'uiSystem'
  ]);
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

async function initializeMcp(client) {
  const initResponse = await client.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });
  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  client.notify('notifications/initialized');
}

test('Simple HTML Export v1 builds a deterministic Browser Demo artifact without writing by default', async () => {
  const baseline = await buildHtmlGameExportV1(scenePath);
  const repeated = await buildHtmlGameExportV1(scenePath);

  assert.deepEqual(baseline, repeated);
  assert.equal(baseline.exportVersion, SIMPLE_HTML_EXPORT_VERSION);
  assert.equal(baseline.scene, 'v1-small-2d');
  assert.deepEqual(baseline.options, {
    movementBlocking: false,
    gameplayHud: false,
    playableSaveLoad: false,
    audioLite: false,
    uiSystem: false
  });
  assert.equal(baseline.sizeBytes, Buffer.byteLength(baseline.html, 'utf8'));
  assert.equal(baseline.htmlHash, sha256Hex(baseline.html));
  assert.match(baseline.html, /^<!DOCTYPE html>/);
  assert.match(baseline.html, /<canvas id="browser-playable-demo-canvas"/);
  assert.match(baseline.html, /v1-small-2d HTML Game Export/);
  assert.doesNotMatch(baseline.html, /"movementBlocking":/);
  assert.doesNotMatch(baseline.html, /"gameplayHud":/);
  assert.doesNotMatch(baseline.html, /"playableSaveLoad":/);
  assert.doesNotMatch(baseline.html, /"audioLite":/);
  assert.doesNotMatch(baseline.html, /"uiSystem":/);
  assert.doesNotMatch(baseline.html, /browser-playable-save-load/);
  assert.doesNotMatch(baseline.html, /browser-audio-lite/);
  assert.doesNotMatch(baseline.html, /browser-ui-system/);
  assertNoForbiddenExportHtmlSurface(baseline.html);
});

test('Simple HTML Export v1 keeps production UI overlay size bounded', async () => {
  const baseline = await buildHtmlGameExportV1(uiProductionScenePath);
  const withUiSystem = await buildHtmlGameExportV1(uiProductionScenePath, { uiSystem: true });
  const deltaBytes = withUiSystem.sizeBytes - baseline.sizeBytes;

  assert.equal(baseline.scene, 'ui-production-screens');
  assert.equal(withUiSystem.scene, 'ui-production-screens');
  assert.equal(deltaBytes > 0, true);
  assert.equal(deltaBytes <= UI_SYSTEM_EXPORT_DELTA_BUDGET_BYTES, true);
  assert.match(withUiSystem.html, /data-screen-id="hud\.main"/);
  assert.match(withUiSystem.html, /data-screen-id="menu\.main"/);
  assert.doesNotMatch(withUiSystem.html, /data-screen-id="pause\.overlay"/);
  assertNoForbiddenExportHtmlSurface(withUiSystem.html);
});

test('Simple HTML Export v1 keeps action-semantics scenes passive when uiSystem is enabled', async () => {
  const withUiSystem = await buildHtmlGameExportV1(uiActionSemanticsScenePath, { uiSystem: true });

  assert.equal(withUiSystem.scene, 'ui-action-semantics');
  assert.match(withUiSystem.html, /"uiSystem":\{"enabled":true,"scene":"ui-action-semantics"/);
  assert.match(withUiSystem.html, />Start Mission<\/div>/);
  assert.match(withUiSystem.html, />Continue Mission<\/div>/);
  assert.doesNotMatch(withUiSystem.html, /"uiInputStepReportVersion":/);
  assert.doesNotMatch(withUiSystem.html, /"uiExplicitInputStepReportVersion":/);
  assert.doesNotMatch(withUiSystem.html, /"uiExplicitInputVersion":/);
  assert.doesNotMatch(withUiSystem.html, /focusedActionIdBefore/);
  assert.doesNotMatch(withUiSystem.html, /activatedActionId/);
  assert.doesNotMatch(withUiSystem.html, /actionCandidates/);
  assertNoForbiddenExportHtmlSurface(withUiSystem.html);
});

test('Simple HTML Export v1 keeps empty drawCalls aligned across runtime, CLI and MCP for scenes without visual components', async (t) => {
  const runtimeEnvelope = await buildHtmlGameExportV1(portableEmptyVisualScenePath);
  const repeatedRuntimeEnvelope = await buildHtmlGameExportV1(portableEmptyVisualScenePath);

  assert.deepEqual(runtimeEnvelope, repeatedRuntimeEnvelope);
  assert.equal(runtimeEnvelope.exportVersion, SIMPLE_HTML_EXPORT_VERSION);
  assert.equal(runtimeEnvelope.scene, 'portable-empty-visual-fixture');
  assert.deepEqual(runtimeEnvelope.options, {
    movementBlocking: false,
    gameplayHud: false,
    playableSaveLoad: false,
    audioLite: false,
    uiSystem: false
  });
  assert.equal(runtimeEnvelope.sizeBytes, Buffer.byteLength(runtimeEnvelope.html, 'utf8'));
  assert.equal(runtimeEnvelope.htmlHash, sha256Hex(runtimeEnvelope.html));
  assert.match(runtimeEnvelope.html, /^<!DOCTYPE html>/);
  assert.match(runtimeEnvelope.html, /portable-empty-visual-fixture HTML Game Export/);
  assert.match(runtimeEnvelope.html, /"drawCalls":\[\]/);
  assert.doesNotMatch(runtimeEnvelope.html, /"movementBlocking":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"gameplayHud":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"playableSaveLoad":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"audioLite":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"uiSystem":/);
  assertNoForbiddenExportHtmlSurface(runtimeEnvelope.html);

  const repoTempDir = await createRepoTempDir(t);
  const cliOutPath = path.join(repoTempDir, 'portable-empty-visual-cli.html');
  const mcpOutPath = path.join(repoTempDir, 'portable-empty-visual-mcp.html');
  const cliResult = runCli([
    'export-html-game',
    portableEmptyVisualScenePath,
    '--out',
    cliOutPath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);
  assertExportEnvelopeShape(cliEnvelope, { expectedScene: 'portable-empty-visual-fixture' });
  const cliHtml = await readFile(cliEnvelope.outputPath, 'utf8');

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const mcpResponse = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: portableEmptyVisualSceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath)
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;
    assertExportEnvelopeShape(mcpEnvelope, { expectedScene: 'portable-empty-visual-fixture' });
    const mcpHtml = await readFile(mcpEnvelope.outputPath, 'utf8');

    assert.deepEqual(cliEnvelope.options, runtimeEnvelope.options);
    assert.deepEqual(mcpEnvelope.options, runtimeEnvelope.options);
    assert.equal(cliEnvelope.sizeBytes, runtimeEnvelope.sizeBytes);
    assert.equal(mcpEnvelope.sizeBytes, runtimeEnvelope.sizeBytes);
    assert.equal(cliEnvelope.htmlHash, runtimeEnvelope.htmlHash);
    assert.equal(mcpEnvelope.htmlHash, runtimeEnvelope.htmlHash);
    assert.equal(cliHtml, runtimeEnvelope.html);
    assert.equal(mcpHtml, runtimeEnvelope.html);
    assert.equal(mcpHtml, cliHtml);
    assertNoForbiddenExportHtmlSurface(cliHtml);
    assertNoForbiddenExportHtmlSurface(mcpHtml);
  } finally {
    await client.close();
  }
});

test('Simple HTML Export v1 keeps fully inherited prefab-backed asset-backed sprite Browser Demo HTML aligned across runtime, CLI and MCP when assetManifestPath is provided', async (t) => {
  const runtimeEnvelope = await buildHtmlGameExportV1(prefabOnlyScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });
  const repeatedRuntimeEnvelope = await buildHtmlGameExportV1(prefabOnlyScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });

  assert.deepEqual(runtimeEnvelope, repeatedRuntimeEnvelope);
  assert.equal(runtimeEnvelope.exportVersion, SIMPLE_HTML_EXPORT_VERSION);
  assert.equal(runtimeEnvelope.scene, 'prefab-usage-prefab-only-fixture');
  assert.deepEqual(runtimeEnvelope.options, {
    movementBlocking: false,
    gameplayHud: false,
    playableSaveLoad: false,
    audioLite: false,
    uiSystem: false
  });
  assert.equal(runtimeEnvelope.sizeBytes, Buffer.byteLength(runtimeEnvelope.html, 'utf8'));
  assert.equal(runtimeEnvelope.htmlHash, sha256Hex(runtimeEnvelope.html));
  assert.match(runtimeEnvelope.html, /^<!DOCTYPE html>/);
  assert.match(runtimeEnvelope.html, /prefab-usage-prefab-only-fixture HTML Game Export/);
  assert.match(runtimeEnvelope.html, /"assetId":"player\.sprite"/);
  assert.match(runtimeEnvelope.html, /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/);
  assert.doesNotMatch(runtimeEnvelope.html, /"movementBlocking":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"gameplayHud":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"playableSaveLoad":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"audioLite":/);
  assert.doesNotMatch(runtimeEnvelope.html, /"uiSystem":/);
  assertNoForbiddenExportHtmlSurface(runtimeEnvelope.html);

  const repoTempDir = await createRepoTempDir(t);
  const cliOutPath = path.join(repoTempDir, 'prefab-only-cli.html');
  const mcpOutPath = path.join(repoTempDir, 'prefab-only-mcp.html');
  const cliResult = runCli([
    'export-html-game',
    prefabOnlyScenePath,
    '--out',
    cliOutPath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);
  assertExportEnvelopeShape(cliEnvelope, { expectedScene: 'prefab-usage-prefab-only-fixture' });
  const cliHtml = await readFile(cliEnvelope.outputPath, 'utf8');

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const mcpResponse = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: prefabOnlySceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath),
        assetManifestPath: visualSpriteAssetManifestMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;
    assertExportEnvelopeShape(mcpEnvelope, { expectedScene: 'prefab-usage-prefab-only-fixture' });
    const mcpHtml = await readFile(mcpEnvelope.outputPath, 'utf8');

    assert.deepEqual(cliEnvelope.options, runtimeEnvelope.options);
    assert.deepEqual(mcpEnvelope.options, runtimeEnvelope.options);
    assert.equal(cliEnvelope.sizeBytes, runtimeEnvelope.sizeBytes);
    assert.equal(mcpEnvelope.sizeBytes, runtimeEnvelope.sizeBytes);
    assert.equal(cliEnvelope.htmlHash, runtimeEnvelope.htmlHash);
    assert.equal(mcpEnvelope.htmlHash, runtimeEnvelope.htmlHash);
    assert.equal(cliHtml, runtimeEnvelope.html);
    assert.equal(mcpHtml, runtimeEnvelope.html);
    assert.equal(mcpHtml, cliHtml);
    assertNoForbiddenExportHtmlSurface(cliHtml);
    assertNoForbiddenExportHtmlSurface(mcpHtml);
  } finally {
    await client.close();
  }
});

test('export-html-game CLI writes deterministic files for each supported option set', async (t) => {
  const outDir = await createTempDir(t);
  const cases = [
    {
      name: 'default',
      flags: [],
      options: { movementBlocking: false, gameplayHud: false, playableSaveLoad: false, audioLite: false, uiSystem: false },
      present: [],
      absent: [/"movementBlocking":/, /"gameplayHud":/, /"playableSaveLoad":/, /"audioLite":/, /"uiSystem":/, /browser-playable-save-load/, /browser-audio-lite/, /browser-ui-system/]
    },
    {
      name: 'movement-blocking',
      flags: ['--movement-blocking'],
      options: { movementBlocking: true, gameplayHud: false, playableSaveLoad: false, audioLite: false, uiSystem: false },
      present: [/"movementBlocking":/],
      absent: [/"gameplayHud":/, /"playableSaveLoad":/, /"audioLite":/, /"uiSystem":/]
    },
    {
      name: 'gameplay-hud',
      flags: ['--gameplay-hud'],
      options: { movementBlocking: false, gameplayHud: true, playableSaveLoad: false, audioLite: false, uiSystem: false },
      present: [/id="browser-gameplay-hud"/, /"gameplayHud":\{"enabled":true,"movementBlockingEnabled":false,"snapshotTick":0\}/],
      absent: [/"movementBlocking":/, /"playableSaveLoad":/, /"audioLite":/, /"uiSystem":/]
    },
    {
      name: 'playable-save-load',
      flags: ['--playable-save-load'],
      options: { movementBlocking: false, gameplayHud: false, playableSaveLoad: true, audioLite: false, uiSystem: false },
      present: [/id="browser-playable-save-load"/, /"playableSaveLoad":/],
      absent: [/"movementBlocking":/, /"gameplayHud":/, /"audioLite":/, /"uiSystem":/]
    },
    {
      name: 'audio-lite',
      flags: ['--audio-lite'],
      options: { movementBlocking: false, gameplayHud: false, playableSaveLoad: false, audioLite: true, uiSystem: false },
      present: [/id="browser-audio-lite"/, /"audioLite":\{"clips":\[/],
      absent: [/"movementBlocking":/, /"gameplayHud":/, /"playableSaveLoad":/, /"uiSystem":/]
    },
    {
      name: 'ui-system',
      flags: ['--ui-system'],
      scenePath: uiProductionScenePath,
      expectedScene: 'ui-production-screens',
      options: { movementBlocking: false, gameplayHud: false, playableSaveLoad: false, audioLite: false, uiSystem: true },
      present: [/id="browser-ui-system"/, /"uiSystem":\{"enabled":true,"scene":"ui-production-screens"/, />Skyline Rescue<\/div>/, />Score 000<\/div>/],
      absent: [/"movementBlocking":/, /"gameplayHud":/, /"playableSaveLoad":/, /"audioLite":/, /"uiInputStepReportVersion":/, /"uiExplicitInputStepReportVersion":/, /"uiExplicitInputVersion":/, /data-screen-id="pause\.overlay"/, /id="browser-gameplay-hud"/]
    },
    {
      name: 'all-options',
      flags: ['--movement-blocking', '--gameplay-hud', '--playable-save-load', '--audio-lite', '--ui-system'],
      options: { movementBlocking: true, gameplayHud: true, playableSaveLoad: true, audioLite: true, uiSystem: true },
      present: [/"movementBlocking":/, /id="browser-gameplay-hud"/, /id="browser-playable-save-load"/, /id="browser-audio-lite"/, /"uiSystem":/],
      absent: []
    }
  ];

  for (const testCase of cases) {
    const outPath = path.join(outDir, `${testCase.name}.html`);
    const result = runCli([
      'export-html-game',
      testCase.scenePath ?? scenePath,
      '--out',
      outPath,
      ...testCase.flags,
      '--json'
    ]);

    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(result.stdout);
    assertExportEnvelopeShape(envelope, { expectedScene: testCase.expectedScene ?? 'v1-small-2d' });
    assert.equal(envelope.outputPath, path.resolve(outPath));
    assert.deepEqual(envelope.options, testCase.options);

    const html = await readFile(envelope.outputPath, 'utf8');
    assert.equal(envelope.sizeBytes, Buffer.byteLength(html, 'utf8'));
    assert.equal(envelope.htmlHash, sha256Hex(html));
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<canvas id="browser-playable-demo-canvas"/);
    assert.match(html, /requestAnimationFrame\(renderFrame\)/);
    assertNoForbiddenExportHtmlSurface(html);

    for (const pattern of testCase.present) {
      assert.match(html, pattern);
    }
    for (const pattern of testCase.absent) {
      assert.doesNotMatch(html, pattern);
    }
  }
});

test('export-html-game CLI requires --out and prints outputPath in readable mode', async (t) => {
  const outDir = await createTempDir(t);
  const outPath = path.join(outDir, 'readable.html');
  const missingOut = runCli(['export-html-game', scenePath]);
  const readable = runCli(['export-html-game', scenePath, '--out', outPath]);

  assert.notEqual(missingOut.status, 0);
  assert.match(missingOut.stderr, /export-html-game: --out is required/);
  assert.equal(readable.status, 0, readable.stderr);
  assert.equal(readable.stdout.trim(), path.resolve(outPath));

  const html = await readFile(outPath, 'utf8');
  assert.match(html, /^<!DOCTYPE html>/);
});

test('Simple HTML Export v1 fails predictably across runtime, CLI and MCP for unsafe prefab path references', async (t) => {
  const repoTempDir = await createRepoTempDir(t);
  const cliOutPath = path.join(repoTempDir, 'unsafe-prefab-cli.html');
  const mcpOutPath = path.join(repoTempDir, 'unsafe-prefab-mcp.html');

  await assert.rejects(
    () => buildHtmlGameExportV1(unsafePrefabPathsScenePath),
    /Scene validation failed/
  );

  const cliResult = runCli([
    'export-html-game',
    unsafePrefabPathsScenePath,
    '--out',
    cliOutPath,
    '--json'
  ]);

  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /SceneValidationError: Scene validation failed for/);
  assert.match(cliResult.stderr, /invalid_prefab_unsafe_paths\.scene\.json/);

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const mcpResponse = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: unsafePrefabPathsSceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath)
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    assert.equal(mcpResponse.result.structuredContent.ok, false);
    assert.equal(mcpResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(mcpResponse.result.content[0].text, /Scene validation failed for/);
    assert.match(mcpResponse.result.structuredContent.errorMessage, /invalid_prefab_unsafe_paths\.scene\.json/);
  } finally {
    await client.close();
  }
});

test('export_html_game MCP writes the same all-options HTML export as CLI', async (t) => {
  const repoTempDir = await createRepoTempDir(t);
  const cliOutPath = path.join(repoTempDir, 'cli-all.html');
  const mcpOutPath = path.join(repoTempDir, 'mcp-all.html');
  const cliResult = runCli([
    'export-html-game',
    scenePath,
    '--out',
    cliOutPath,
    '--movement-blocking',
    '--gameplay-hud',
    '--playable-save-load',
    '--audio-lite',
    '--ui-system',
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);
  const cliHtml = await readFile(cliEnvelope.outputPath, 'utf8');

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const toolsResponse = await client.request('tools/list');
    const tool = toolsResponse.result.tools.find((candidate) => candidate.name === 'export_html_game');
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ['scenePath', 'outputPath']);
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'assetManifestPath'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'movementBlocking'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'gameplayHud'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'playableSaveLoad'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'audioLite'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'uiSystem'));

    const mcpResponse = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: sceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath),
        movementBlocking: true,
        gameplayHud: true,
        playableSaveLoad: true,
        audioLite: true,
        uiSystem: true
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;
    assertExportEnvelopeShape(mcpEnvelope);
    assert.equal(mcpEnvelope.outputPath, mcpOutPath);
    assert.deepEqual(
      { ...mcpEnvelope, outputPath: '<normalized>' },
      { ...cliEnvelope, outputPath: '<normalized>' }
    );

    const mcpHtml = await readFile(mcpEnvelope.outputPath, 'utf8');
    assert.equal(mcpHtml, cliHtml);
    assertNoForbiddenExportHtmlSurface(mcpHtml);
  } finally {
    await client.close();
  }
});

test('export_html_game MCP writes the same production UI overlay export as CLI', async (t) => {
  const repoTempDir = await createRepoTempDir(t);
  const cliOutPath = path.join(repoTempDir, 'cli-ui-production.html');
  const mcpOutPath = path.join(repoTempDir, 'mcp-ui-production.html');
  const cliResult = runCli([
    'export-html-game',
    uiProductionScenePath,
    '--out',
    cliOutPath,
    '--ui-system',
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);
  assert.deepEqual(cliEnvelope.options, {
    movementBlocking: false,
    gameplayHud: false,
    playableSaveLoad: false,
    audioLite: false,
    uiSystem: true
  });
  const cliHtml = await readFile(cliEnvelope.outputPath, 'utf8');
  assert.match(cliHtml, /"uiSystem":\{"enabled":true,"scene":"ui-production-screens"/);
  assert.match(cliHtml, />Skyline Rescue<\/div>/);
  assert.match(cliHtml, />Score 000<\/div>/);
  assert.doesNotMatch(cliHtml, /data-screen-id="pause\.overlay"/);
  assert.doesNotMatch(cliHtml, /id="browser-gameplay-hud"/);

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const mcpResponse = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: uiProductionSceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath),
        uiSystem: true
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;
    assertExportEnvelopeShape(mcpEnvelope, { expectedScene: 'ui-production-screens' });
    assert.equal(mcpEnvelope.outputPath, mcpOutPath);
    assert.deepEqual(
      { ...mcpEnvelope, outputPath: '<normalized>' },
      { ...cliEnvelope, outputPath: '<normalized>' }
    );

    const mcpHtml = await readFile(mcpEnvelope.outputPath, 'utf8');
    assert.equal(mcpHtml, cliHtml);
    assertNoForbiddenExportHtmlSurface(mcpHtml);
  } finally {
    await client.close();
  }
});

test('export_html_game MCP rejects invalid arguments and output paths outside the repo', async () => {
  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const missingScenePath = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: { outputPath: './tmp/out.html' }
    });
    const invalidFlag = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: sceneMcpPath,
        outputPath: './tmp/out.html',
        movementBlocking: 'yes'
      }
    });
    const invalidAudioLiteFlag = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: sceneMcpPath,
        outputPath: './tmp/out.html',
        audioLite: 'yes'
      }
    });
    const invalidUiSystemFlag = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: sceneMcpPath,
        outputPath: './tmp/out.html',
        uiSystem: 'yes'
      }
    });
    const invalidAssetManifestPath = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: sceneMcpPath,
        outputPath: './tmp/out.html',
        assetManifestPath: true
      }
    });
    const outsideOutput = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: sceneMcpPath,
        outputPath: path.resolve(repoRoot, '..', 'outside.html')
      }
    });

    assert.equal(missingScenePath.result.isError, true);
    assert.match(missingScenePath.result.content[0].text, /scenePath/);
    assert.equal(invalidFlag.result.isError, true);
    assert.match(invalidFlag.result.content[0].text, /movementBlocking/);
    assert.equal(invalidAudioLiteFlag.result.isError, true);
    assert.match(invalidAudioLiteFlag.result.content[0].text, /audioLite/);
    assert.equal(invalidUiSystemFlag.result.isError, true);
    assert.match(invalidUiSystemFlag.result.content[0].text, /uiSystem/);
    assert.equal(invalidAssetManifestPath.result.isError, true);
    assert.match(invalidAssetManifestPath.result.content[0].text, /assetManifestPath/);
    assert.equal(outsideOutput.result.isError, true);
    assert.match(outsideOutput.result.content[0].text, /path must stay inside the repository root/);
  } finally {
    await client.close();
  }
});
