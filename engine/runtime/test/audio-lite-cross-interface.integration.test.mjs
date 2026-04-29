import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildAudioLiteReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures');

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

async function callMcpTool(name, args) {
  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    return await mcp.request('tools/call', {
      name,
      arguments: args
    });
  } finally {
    await mcp.close();
  }
}

async function assertAudioLiteInterfacesAligned(fixtureName) {
  const absolutePath = path.join(fixtureDir, fixtureName);
  const relativePath = `./engine/runtime/test/fixtures/${fixtureName}`;
  const runtimeReport = await buildAudioLiteReportV1(absolutePath);
  const cliResult = runCli(['inspect-audio-lite', absolutePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_audio_lite', {
    path: relativePath
  });

  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  return runtimeReport;
}

test('AudioLiteReport v1 stays aligned across runtime, CLI and MCP for scenes without audio', async () => {
  const report = await assertAudioLiteInterfacesAligned('audio-lite-empty.scene.json');

  assert.deepEqual(report, {
    audioLiteReportVersion: 1,
    scene: 'audio-lite-empty-fixture',
    clips: [],
    triggers: [],
    warnings: [],
    invalidRefs: []
  });
});

test('AudioLiteReport v1 stays aligned across runtime, CLI and MCP for missing src warnings', async () => {
  const report = await assertAudioLiteInterfacesAligned('audio-lite-sfx.scene.json');

  assert.equal(report.clips[0].clipId, 'sfx.step');
  assert.deepEqual(report.triggers, [
    {
      trigger: 'onMove',
      clipIds: ['sfx.step']
    }
  ]);
  assert.equal(report.warnings[0].code, 'AUDIO_CLIP_SRC_MISSING');
  assert.deepEqual(report.invalidRefs, []);
});

test('AudioLiteReport v1 stays aligned across runtime, CLI and MCP for invalid local source references', async () => {
  const report = await assertAudioLiteInterfacesAligned('audio-lite-music-loop.scene.json');

  assert.equal(report.clips[0].clipId, 'music.theme');
  assert.equal(report.warnings[0].code, 'AUDIO_CLIP_SRC_NOT_FOUND');
  assert.deepEqual(report.invalidRefs, [
    {
      entityId: 'audio.music',
      clipId: 'music.theme',
      src: 'audio/missing-theme.ogg',
      reason: 'AUDIO_CLIP_SRC_NOT_FOUND'
    }
  ]);
});

test('AudioLiteReport v1 invalid scenes fail predictably across runtime, CLI and MCP', async () => {
  const absolutePath = path.join(fixtureDir, 'invalid_audio_lite_trigger.scene.json');
  await assert.rejects(
    () => buildAudioLiteReportV1(absolutePath),
    /Scene validation failed/
  );

  const cliResult = runCli(['inspect-audio-lite', absolutePath, '--json']);
  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /Scene validation failed/);

  const mcpResponse = await callMcpTool('inspect_audio_lite', {
    path: './engine/runtime/test/fixtures/invalid_audio_lite_trigger.scene.json'
  });
  assert.equal(mcpResponse.result.isError, true);
  assert.match(mcpResponse.result.content[0].text, /Scene validation failed/);
});
