import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const validSavePath = path.join(repoRoot, 'fixtures', 'savegame', 'valid.savegame.json');
const legacySavePath = path.join(repoRoot, 'fixtures', 'savegame', 'legacy.v0.savegame.json');
const unsupportedVersionSavePath = path.join(
  repoRoot,
  'fixtures',
  'savegame',
  'invalid.unsupported-version.savegame.json'
);
const validSaveEnvelope = JSON.parse(readFileSync(validSavePath, 'utf8'));
const legacySaveEnvelope = JSON.parse(readFileSync(legacySavePath, 'utf8'));

function normalizeSaveSuccess(payload, envelope) {
  return {
    ok: payload.ok,
    saveVersion: payload.saveVersion ?? envelope.saveVersion,
    contentVersion: payload.contentVersion ?? envelope.contentVersion,
    seed: payload.seed ?? envelope.seed,
    checksum: payload.checksum ?? envelope.checksum,
    payloadRef: payload.payloadRef ?? envelope.payloadRef
  };
}

function normalizeSaveVersionError(payload) {
  const saveVersionError = (payload.errors ?? []).find((error) => error.path === '$.saveVersion');
  const message = String(saveVersionError?.message ?? '').toLowerCase();

  return {
    ok: payload.ok,
    hasSaveVersionPath: saveVersionError?.path === '$.saveVersion',
    isUnsupportedVersionFamily:
      message.includes('unsupported') &&
      message.includes('saveversion') &&
      message.includes('supported: 1')
  };
}

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
    return new Promise((resolve) => {
      pending.set(id, { resolve });
    });
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

test('validate_save success payload stays semantically aligned across CLI and MCP', async () => {
  const cliResult = runCli(['validate-save', validSavePath, '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliSuccess = normalizeSaveSuccess(JSON.parse(cliResult.stdout), validSaveEnvelope);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'validate_save',
      arguments: {
        path: './fixtures/savegame/valid.savegame.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpSuccess = normalizeSaveSuccess(mcpResponse.result.structuredContent, validSaveEnvelope);

    assert.equal(cliSuccess.ok, true);
    assert.equal(mcpSuccess.ok, true);
    assert.deepEqual(cliSuccess, mcpSuccess);
  } finally {
    await mcp.close();
  }
});

test('validate_save legacy v0 payload stays semantically aligned across CLI and MCP after migration', async () => {
  const cliResult = runCli(['validate-save', legacySavePath, '--json']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliSuccess = normalizeSaveSuccess(JSON.parse(cliResult.stdout), {
    ...legacySaveEnvelope,
    saveVersion: 1
  });

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'validate_save',
      arguments: {
        path: './fixtures/savegame/legacy.v0.savegame.json'
      }
    });

    assert.equal(mcpResponse.result.isError, false);
    const mcpSuccess = normalizeSaveSuccess(mcpResponse.result.structuredContent, {
      ...legacySaveEnvelope,
      saveVersion: 1
    });

    assert.equal(cliSuccess.ok, true);
    assert.equal(mcpSuccess.ok, true);
    assert.equal(cliSuccess.saveVersion, 1);
    assert.equal(mcpSuccess.saveVersion, 1);
    assert.deepEqual(cliSuccess, mcpSuccess);
  } finally {
    await mcp.close();
  }
});

test('validate_save unsupported saveVersion error stays semantically aligned across CLI and MCP', async () => {
  const cliResult = runCli(['validate-save', unsupportedVersionSavePath, '--json']);
  assert.equal(cliResult.status, 1, cliResult.stderr);
  const cliError = normalizeSaveVersionError(JSON.parse(cliResult.stdout));

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'validate_save',
      arguments: {
        path: './fixtures/savegame/invalid.unsupported-version.savegame.json'
      }
    });

    assert.equal(mcpResponse.result.isError, true);
    const mcpError = normalizeSaveVersionError(mcpResponse.result.structuredContent);

    assert.equal(cliError.ok, false);
    assert.equal(mcpError.ok, false);
    assert.equal(cliError.hasSaveVersionPath, true);
    assert.equal(mcpError.hasSaveVersionPath, true);
    assert.equal(cliError.isUnsupportedVersionFamily, true);
    assert.equal(mcpError.isUnsupportedVersionFamily, true);
    assert.deepEqual(cliError, mcpError);
  } finally {
    await mcp.close();
  }
});
