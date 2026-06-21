import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildPortableHtmlGameExportV2,
  PORTABLE_HTML_EXPORT_VERSION,
  sha256Hex
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const spriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json');
const spriteSceneMcpPath = './fixtures/assets/sprite.scene.json';
const spriteAnimationIdleScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'sprite-animation-idle.scene.json'
);
const spriteAnimationIdleSceneMcpPath = './engine/runtime/test/fixtures/sprite-animation-idle.scene.json';
const uiScreenPrefabScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'ui-screen-prefab.scene.json'
);
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');
const validAssetManifestMcpPath = './fixtures/assets/valid.asset-manifest.json';
const unsupportedPortableAssetManifestPath = path.join(
  repoRoot,
  'fixtures',
  'assets',
  'portable-unsupported-extension.asset-manifest.json'
);
const unsupportedPortableAssetManifestMcpPath = './fixtures/assets/portable-unsupported-extension.asset-manifest.json';

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

async function createTempDir(t, prefix = 'portable-html-export-v2-') {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

async function createRepoTempDir(t) {
  const directory = await mkdtemp(path.join(repoRoot, '.tmp-portable-html-export-v2-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

function assertNoForbiddenPortableExportHtmlSurface(html) {
  assert.doesNotMatch(
    html,
    /<script[^>]+src=|<link[^>]+href=|https?:\/\/|file:\/\/\/|fetch\(|XMLHttpRequest|WebSocket|EventSource|import\(|Date\.now|new Date|performance\.now|localStorage|sessionStorage|IndexedDB|indexedDB/
  );
}

function assertPortableExportEnvelopeShape(envelope, { expectedScene }) {
  assert.deepEqual(Object.keys(envelope), [
    'exportVersion',
    'scene',
    'outputPath',
    'options',
    'embeddedAssetCount',
    'sizeBytes',
    'htmlHash'
  ]);
  assert.equal(envelope.exportVersion, PORTABLE_HTML_EXPORT_VERSION);
  assert.equal(envelope.scene, expectedScene);
  assert.deepEqual(Object.keys(envelope.options), [
    'assetManifest',
    'movementBlocking',
    'gameplayHud',
    'playableSaveLoad',
    'audioLite',
    'spriteAnimation',
    'uiSystem'
  ]);
  assert.equal(Number.isInteger(envelope.embeddedAssetCount), true);
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

test('Portable HTML Export v2 builds deterministic inline-asset HTML without mutating export v1 behavior', async () => {
  const baseline = await buildPortableHtmlGameExportV2(spriteScenePath, {
    assetManifestPath: validAssetManifestPath
  });
  const repeated = await buildPortableHtmlGameExportV2(spriteScenePath, {
    assetManifestPath: validAssetManifestPath
  });

  assert.deepEqual(baseline, repeated);
  assert.equal(baseline.exportVersion, PORTABLE_HTML_EXPORT_VERSION);
  assert.equal(baseline.scene, 'sprite-fixture');
  assert.deepEqual(baseline.options, {
    assetManifest: true,
    movementBlocking: false,
    gameplayHud: false,
    playableSaveLoad: false,
    audioLite: false,
    spriteAnimation: false,
    uiSystem: false
  });
  assert.equal(baseline.embeddedAssetCount, 2);
  assert.equal(baseline.sizeBytes, Buffer.byteLength(baseline.html, 'utf8'));
  assert.equal(baseline.htmlHash, sha256Hex(baseline.html));
  assert.match(baseline.html, /^<!DOCTYPE html>/);
  assert.match(baseline.html, /sprite-fixture Portable HTML Game Export/);
  assert.equal(baseline.html.match(/data:image\/png;base64,/g)?.length ?? 0, 2);
  assert.doesNotMatch(baseline.html, /file:\/\/\//);
  assert.doesNotMatch(baseline.html, /"spriteAnimation":/);
  assertNoForbiddenPortableExportHtmlSurface(baseline.html);
});

test('Portable HTML Export v2 keeps rect fallback without assetManifestPath even when spriteAnimation is enabled', async () => {
  const baseline = await buildPortableHtmlGameExportV2(spriteAnimationIdleScenePath, {
    spriteAnimation: true
  });
  const repeated = await buildPortableHtmlGameExportV2(spriteAnimationIdleScenePath, {
    spriteAnimation: true
  });

  assert.deepEqual(baseline, repeated);
  assert.equal(baseline.exportVersion, PORTABLE_HTML_EXPORT_VERSION);
  assert.equal(baseline.scene, 'sprite-animation-idle-fixture');
  assert.deepEqual(baseline.options, {
    assetManifest: false,
    movementBlocking: false,
    gameplayHud: false,
    playableSaveLoad: false,
    audioLite: false,
    spriteAnimation: true,
    uiSystem: false
  });
  assert.equal(baseline.embeddedAssetCount, 0);
  assert.equal(baseline.sizeBytes, Buffer.byteLength(baseline.html, 'utf8'));
  assert.equal(baseline.htmlHash, sha256Hex(baseline.html));
  assert.match(baseline.html, /^<!DOCTYPE html>/);
  assert.match(baseline.html, /sprite-animation-idle-fixture Portable HTML Game Export/);
  assert.match(baseline.html, /"spriteAnimation":\{/);
  assert.match(baseline.html, /"animationId":"player\.idle"/);
  assert.match(baseline.html, /"kind":"rect"/);
  assert.doesNotMatch(baseline.html, /"kind":"sprite"/);
  assert.doesNotMatch(baseline.html, /data:image\/png;base64,/);
  assert.doesNotMatch(baseline.html, /file:\/\/\//);
  assertNoForbiddenPortableExportHtmlSurface(baseline.html);
});

test('export-portable-html-game CLI writes deterministic files for inline assets, sprite animation and UI overlay', async (t) => {
  const outDir = await createTempDir(t);
  const cases = [
    {
      name: 'portable-assets',
      scenePath: spriteScenePath,
      flags: ['--asset-manifest', validAssetManifestPath],
      expectedScene: 'sprite-fixture',
      expectedEmbeddedAssetCount: 2,
      options: {
        assetManifest: true,
        movementBlocking: false,
        gameplayHud: false,
        playableSaveLoad: false,
        audioLite: false,
        spriteAnimation: false,
        uiSystem: false
      },
      present: [/"kind":"sprite"/, /"assetSrc":"data:image\/png;base64,/],
      absent: [/file:\/\/\//, /"spriteAnimation":/, /"uiSystem":/]
    },
    {
      name: 'sprite-animation',
      scenePath: spriteAnimationIdleScenePath,
      flags: ['--asset-manifest', validAssetManifestPath, '--sprite-animation'],
      expectedScene: 'sprite-animation-idle-fixture',
      expectedEmbeddedAssetCount: 1,
      options: {
        assetManifest: true,
        movementBlocking: false,
        gameplayHud: false,
        playableSaveLoad: false,
        audioLite: false,
        spriteAnimation: true,
        uiSystem: false
      },
      present: [/"spriteAnimation":\{/, /"animationId":"player\.idle"/, /"assetSrc":"data:image\/png;base64,/],
      absent: [/file:\/\/\//, /"uiSystem":/]
    },
    {
      name: 'sprite-animation-fallback-no-manifest',
      scenePath: spriteAnimationIdleScenePath,
      flags: ['--sprite-animation'],
      expectedScene: 'sprite-animation-idle-fixture',
      expectedEmbeddedAssetCount: 0,
      options: {
        assetManifest: false,
        movementBlocking: false,
        gameplayHud: false,
        playableSaveLoad: false,
        audioLite: false,
        spriteAnimation: true,
        uiSystem: false
      },
      present: [/"spriteAnimation":\{/, /"animationId":"player\.idle"/, /"kind":"rect"/],
      absent: [/file:\/\/\//, /data:image\/png;base64,/, /"kind":"sprite"/, /"uiSystem":/]
    },
    {
      name: 'ui-system',
      scenePath: uiScreenPrefabScenePath,
      flags: ['--ui-system'],
      expectedScene: 'ui-screen-prefab-fixture',
      expectedEmbeddedAssetCount: 0,
      options: {
        assetManifest: false,
        movementBlocking: false,
        gameplayHud: false,
        playableSaveLoad: false,
        audioLite: false,
        spriteAnimation: false,
        uiSystem: true
      },
      present: [/id="browser-ui-system"/, /"uiSystem":\{"enabled":true,"scene":"ui-screen-prefab-fixture"/, />Score: 000<\/div>/],
      absent: [/file:\/\/\//, /"assetSrc":"data:image\/png;base64,/]
    }
  ];

  for (const testCase of cases) {
    const outPath = path.join(outDir, `${testCase.name}.html`);
    const result = runCli([
      'export-portable-html-game',
      testCase.scenePath,
      '--out',
      outPath,
      ...testCase.flags,
      '--json'
    ]);

    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(result.stdout);
    assertPortableExportEnvelopeShape(envelope, { expectedScene: testCase.expectedScene });
    assert.equal(envelope.outputPath, path.resolve(outPath));
    assert.deepEqual(envelope.options, testCase.options);
    assert.equal(envelope.embeddedAssetCount, testCase.expectedEmbeddedAssetCount);

    const html = await readFile(envelope.outputPath, 'utf8');
    assert.equal(envelope.sizeBytes, Buffer.byteLength(html, 'utf8'));
    assert.equal(envelope.htmlHash, sha256Hex(html));
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<canvas id="browser-playable-demo-canvas"/);
    assertNoForbiddenPortableExportHtmlSurface(html);

    for (const pattern of testCase.present) {
      assert.match(html, pattern);
    }
    for (const pattern of testCase.absent) {
      assert.doesNotMatch(html, pattern);
    }
  }
});

test('export-portable-html-game CLI requires --out and prints outputPath in readable mode', async (t) => {
  const outDir = await createTempDir(t);
  const outPath = path.join(outDir, 'portable-readable.html');
  const missingOut = runCli(['export-portable-html-game', spriteScenePath]);
  const readable = runCli([
    'export-portable-html-game',
    spriteScenePath,
    '--asset-manifest',
    validAssetManifestPath,
    '--out',
    outPath
  ]);

  assert.notEqual(missingOut.status, 0);
  assert.match(missingOut.stderr, /export-portable-html-game: --out is required/);
  assert.equal(readable.status, 0, readable.stderr);
  assert.equal(readable.stdout.trim(), path.resolve(outPath));

  const html = await readFile(outPath, 'utf8');
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /data:image\/png;base64,/);
});

test('Portable HTML Export v2 fails predictably for unsupported inline asset extensions across runtime, CLI and MCP', async (t) => {
  const outDir = await createTempDir(t);
  const repoOutDir = await createRepoTempDir(t);
  const cliOutPath = path.join(outDir, 'portable-unsupported-extension.html');
  const mcpOutPath = path.join(repoOutDir, 'portable-unsupported-extension.html');

  await assert.rejects(
    () =>
      buildPortableHtmlGameExportV2(spriteScenePath, {
        assetManifestPath: unsupportedPortableAssetManifestPath
      }),
    /unsupported image asset extension `\.txt`.*supported extensions: \.png, \.jpg, \.jpeg, \.webp, \.gif, \.bmp, \.svg/
  );

  const cliResult = runCli([
    'export-portable-html-game',
    spriteScenePath,
    '--out',
    cliOutPath,
    '--asset-manifest',
    unsupportedPortableAssetManifestPath
  ]);

  assert.notEqual(cliResult.status, 0);
  assert.match(
    cliResult.stderr,
    /unsupported image asset extension `\.txt`.*supported extensions: \.png, \.jpg, \.jpeg, \.webp, \.gif, \.bmp, \.svg/
  );

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const mcpResponse = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: spriteSceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath),
        assetManifestPath: unsupportedPortableAssetManifestMcpPath
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    assert.match(
      mcpResponse.result.content[0].text,
      /unsupported image asset extension `\.txt`.*supported extensions: \.png, \.jpg, \.jpeg, \.webp, \.gif, \.bmp, \.svg/
    );
  } finally {
    await client.close();
  }
});

test('export_portable_html_game MCP writes the same sprite-animation portable export as CLI', async (t) => {
  const repoTempDir = await createRepoTempDir(t);
  const cliOutPath = path.join(repoTempDir, 'cli-portable-sprite-animation.html');
  const mcpOutPath = path.join(repoTempDir, 'mcp-portable-sprite-animation.html');
  const cliResult = runCli([
    'export-portable-html-game',
    spriteAnimationIdleScenePath,
    '--out',
    cliOutPath,
    '--asset-manifest',
    validAssetManifestPath,
    '--sprite-animation',
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);
  const cliHtml = await readFile(cliEnvelope.outputPath, 'utf8');

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const toolsResponse = await client.request('tools/list');
    const tool = toolsResponse.result.tools.find((candidate) => candidate.name === 'export_portable_html_game');
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ['scenePath', 'outputPath']);
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'assetManifestPath'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'spriteAnimation'));

    const mcpResponse = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: spriteAnimationIdleSceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath),
        assetManifestPath: validAssetManifestMcpPath,
        spriteAnimation: true
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;
    assertPortableExportEnvelopeShape(mcpEnvelope, { expectedScene: 'sprite-animation-idle-fixture' });
    assert.equal(mcpEnvelope.outputPath, mcpOutPath);
    assert.deepEqual(
      { ...mcpEnvelope, outputPath: '<normalized>' },
      { ...cliEnvelope, outputPath: '<normalized>' }
    );

    const mcpHtml = await readFile(mcpEnvelope.outputPath, 'utf8');
    assert.equal(mcpHtml, cliHtml);
    assertNoForbiddenPortableExportHtmlSurface(mcpHtml);
  } finally {
    await client.close();
  }
});

test('export_portable_html_game MCP preserves rect fallback without assetManifestPath when spriteAnimation is true', async (t) => {
  const repoTempDir = await createRepoTempDir(t);
  const cliOutPath = path.join(repoTempDir, 'cli-portable-sprite-animation-no-manifest.html');
  const mcpOutPath = path.join(repoTempDir, 'mcp-portable-sprite-animation-no-manifest.html');
  const cliResult = runCli([
    'export-portable-html-game',
    spriteAnimationIdleScenePath,
    '--out',
    cliOutPath,
    '--sprite-animation',
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliEnvelope = JSON.parse(cliResult.stdout);
  assert.deepEqual(cliEnvelope.options, {
    assetManifest: false,
    movementBlocking: false,
    gameplayHud: false,
    playableSaveLoad: false,
    audioLite: false,
    spriteAnimation: true,
    uiSystem: false
  });
  assert.equal(cliEnvelope.embeddedAssetCount, 0);
  const cliHtml = await readFile(cliEnvelope.outputPath, 'utf8');
  assert.match(cliHtml, /"spriteAnimation":\{/);
  assert.match(cliHtml, /"kind":"rect"/);
  assert.doesNotMatch(cliHtml, /"kind":"sprite"/);
  assert.doesNotMatch(cliHtml, /data:image\/png;base64,/);

  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const mcpResponse = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: spriteAnimationIdleSceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath),
        spriteAnimation: true
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpEnvelope = mcpResponse.result.structuredContent;
    assertPortableExportEnvelopeShape(mcpEnvelope, { expectedScene: 'sprite-animation-idle-fixture' });
    assert.equal(mcpEnvelope.outputPath, mcpOutPath);
    assert.deepEqual(
      { ...mcpEnvelope, outputPath: '<normalized>' },
      { ...cliEnvelope, outputPath: '<normalized>' }
    );

    const mcpHtml = await readFile(mcpEnvelope.outputPath, 'utf8');
    assert.equal(mcpHtml, cliHtml);
    assertNoForbiddenPortableExportHtmlSurface(mcpHtml);
  } finally {
    await client.close();
  }
});

test('export_portable_html_game MCP rejects invalid arguments and output paths outside the repo', async () => {
  const client = createMcpClient();
  try {
    await initializeMcp(client);

    const missingScenePath = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: { outputPath: './tmp/out.html' }
    });
    const invalidAssetManifestPath = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: spriteSceneMcpPath,
        outputPath: './tmp/out.html',
        assetManifestPath: true
      }
    });
    const invalidSpriteAnimationFlag = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: spriteAnimationIdleSceneMcpPath,
        outputPath: './tmp/out.html',
        spriteAnimation: 'yes'
      }
    });
    const outsideOutput = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: spriteSceneMcpPath,
        outputPath: path.resolve(repoRoot, '..', 'outside-portable.html')
      }
    });

    assert.equal(missingScenePath.result.isError, true);
    assert.match(missingScenePath.result.content[0].text, /scenePath/);
    assert.equal(invalidAssetManifestPath.result.isError, true);
    assert.match(invalidAssetManifestPath.result.content[0].text, /assetManifestPath/);
    assert.equal(invalidSpriteAnimationFlag.result.isError, true);
    assert.match(invalidSpriteAnimationFlag.result.content[0].text, /spriteAnimation/);
    assert.equal(outsideOutput.result.isError, true);
    assert.match(outsideOutput.result.content[0].text, /path must stay inside the repository root/);
  } finally {
    await client.close();
  }
});
