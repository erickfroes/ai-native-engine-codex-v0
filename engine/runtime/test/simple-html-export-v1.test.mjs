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
const scenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const sceneMcpPath = './scenes/v1-small-2d.scene.json';

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

function assertExportEnvelopeShape(envelope) {
  assert.deepEqual(Object.keys(envelope), [
    'exportVersion',
    'scene',
    'outputPath',
    'options',
    'sizeBytes',
    'htmlHash'
  ]);
  assert.equal(envelope.exportVersion, SIMPLE_HTML_EXPORT_VERSION);
  assert.equal(envelope.scene, 'v1-small-2d');
  assert.deepEqual(Object.keys(envelope.options), ['movementBlocking', 'gameplayHud', 'playableSaveLoad']);
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
    playableSaveLoad: false
  });
  assert.equal(baseline.sizeBytes, Buffer.byteLength(baseline.html, 'utf8'));
  assert.equal(baseline.htmlHash, sha256Hex(baseline.html));
  assert.match(baseline.html, /^<!DOCTYPE html>/);
  assert.match(baseline.html, /<canvas id="browser-playable-demo-canvas"/);
  assert.match(baseline.html, /v1-small-2d HTML Game Export/);
  assert.doesNotMatch(baseline.html, /"movementBlocking":/);
  assert.doesNotMatch(baseline.html, /"gameplayHud":/);
  assert.doesNotMatch(baseline.html, /"playableSaveLoad":/);
  assert.doesNotMatch(baseline.html, /browser-playable-save-load/);
  assertNoForbiddenExportHtmlSurface(baseline.html);
});

test('export-html-game CLI writes deterministic files for each supported option set', async (t) => {
  const outDir = await createTempDir(t);
  const cases = [
    {
      name: 'default',
      flags: [],
      options: { movementBlocking: false, gameplayHud: false, playableSaveLoad: false },
      present: [],
      absent: [/"movementBlocking":/, /"gameplayHud":/, /"playableSaveLoad":/, /browser-playable-save-load/]
    },
    {
      name: 'movement-blocking',
      flags: ['--movement-blocking'],
      options: { movementBlocking: true, gameplayHud: false, playableSaveLoad: false },
      present: [/"movementBlocking":/],
      absent: [/"gameplayHud":/, /"playableSaveLoad":/]
    },
    {
      name: 'gameplay-hud',
      flags: ['--gameplay-hud'],
      options: { movementBlocking: false, gameplayHud: true, playableSaveLoad: false },
      present: [/id="browser-gameplay-hud"/, /"gameplayHud":\{"enabled":true,"movementBlockingEnabled":false,"snapshotTick":0\}/],
      absent: [/"movementBlocking":/, /"playableSaveLoad":/]
    },
    {
      name: 'playable-save-load',
      flags: ['--playable-save-load'],
      options: { movementBlocking: false, gameplayHud: false, playableSaveLoad: true },
      present: [/id="browser-playable-save-load"/, /"playableSaveLoad":/],
      absent: [/"movementBlocking":/, /"gameplayHud":/]
    },
    {
      name: 'all-options',
      flags: ['--movement-blocking', '--gameplay-hud', '--playable-save-load'],
      options: { movementBlocking: true, gameplayHud: true, playableSaveLoad: true },
      present: [/"movementBlocking":/, /id="browser-gameplay-hud"/, /id="browser-playable-save-load"/],
      absent: []
    }
  ];

  for (const testCase of cases) {
    const outPath = path.join(outDir, `${testCase.name}.html`);
    const result = runCli([
      'export-html-game',
      scenePath,
      '--out',
      outPath,
      ...testCase.flags,
      '--json'
    ]);

    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(result.stdout);
    assertExportEnvelopeShape(envelope);
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
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'movementBlocking'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'gameplayHud'));
    assert.ok(Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, 'playableSaveLoad'));

    const mcpResponse = await client.request('tools/call', {
      name: 'export_html_game',
      arguments: {
        scenePath: sceneMcpPath,
        outputPath: path.relative(repoRoot, mcpOutPath),
        movementBlocking: true,
        gameplayHud: true,
        playableSaveLoad: true
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
    assert.equal(outsideOutput.result.isError, true);
    assert.match(outsideOutput.result.content[0].text, /path must stay inside the repository root/);
  } finally {
    await client.close();
  }
});
