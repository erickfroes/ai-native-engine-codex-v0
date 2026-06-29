import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildAudioEventBankReportV1 } from '../src/index.mjs';
import { assertAudioEventBankReportV1 } from './helpers/assertAudioEventBankReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const validManifestPath = path.join(repoRoot, 'scenes', 'audio-game-feedback.audio-event-bank.json');
const invalidManifestPath = path.join(
  repoRoot,
  'scenes',
  'audio-game-feedback.invalid-missing-clip.audio-event-bank.json'
);

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

async function initializeMcp(mcp) {
  const initResponse = await mcp.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });
  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  mcp.notify('notifications/initialized');
}

test('AudioEventBankReport v1 stays aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildAudioEventBankReportV1(validManifestPath);
  assertAudioEventBankReportV1(runtimeReport);

  const cliResult = runCli(['inspect-audio-event-bank', validManifestPath, '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  assertAudioEventBankReportV1(cliReport);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const toolsResponse = await mcp.request('tools/list');
    const tool = toolsResponse.result.tools.find((candidate) => candidate.name === 'inspect_audio_event_bank');
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ['path']);

    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_audio_event_bank',
      arguments: {
        path: './scenes/audio-game-feedback.audio-event-bank.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpReport = mcpResponse.result.structuredContent;
    assertAudioEventBankReportV1(mcpReport);

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
  } finally {
    await mcp.close();
  }
});

test('AudioEventBankReport v1 invalid manifests stay aligned across runtime, CLI and MCP', async () => {
  const runtimeReport = await buildAudioEventBankReportV1(invalidManifestPath);
  assertAudioEventBankReportV1(runtimeReport);
  assert.equal(runtimeReport.ok, false);

  const cliResult = runCli(['inspect-audio-event-bank', invalidManifestPath, '--json']);
  assert.equal(cliResult.status, 1);
  const cliReport = JSON.parse(cliResult.stdout);
  assertAudioEventBankReportV1(cliReport);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_audio_event_bank',
      arguments: {
        path: './scenes/audio-game-feedback.invalid-missing-clip.audio-event-bank.json'
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    const mcpReport = mcpResponse.result.structuredContent;
    assertAudioEventBankReportV1(mcpReport);

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
  } finally {
    await mcp.close();
  }
});

test('inspect_audio_event_bank rejects invalid MCP arguments predictably', async () => {
  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);
    const missingPath = await mcp.request('tools/call', {
      name: 'inspect_audio_event_bank',
      arguments: {}
    });

    assert.equal(missingPath.result.isError, true);
    assert.match(missingPath.result.content[0].text, /`path` argument is required/);

    const unexpected = await mcp.request('tools/call', {
      name: 'inspect_audio_event_bank',
      arguments: {
        path: './scenes/audio-game-feedback.audio-event-bank.json',
        scenePath: './scenes/audio-game-feedback.scene.json'
      }
    });

    assert.equal(unexpected.result.isError, true);
    assert.match(unexpected.result.content[0].text, /unexpected argument `scenePath`/);
  } finally {
    await mcp.close();
  }
});
