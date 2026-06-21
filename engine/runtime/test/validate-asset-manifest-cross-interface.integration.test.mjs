import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildAssetManifestValidationReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');
const invalidAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid.traversal-src.asset-manifest.json');
const malformedAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid-malformed.asset-manifest.json');
const missingAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'missing.asset-manifest.json');

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
    clientInfo: {
      name: 'node-test',
      version: '1.0.0'
    }
  });

  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  client.notify('notifications/initialized');
}

async function assertCliMcpParity({ runtimePath, cliPathArg, mcpPathArg, expectedIsError }) {
  const runtimeReport = await buildAssetManifestValidationReportV1(runtimePath);

  const cliResult = runCli(['validate-asset-manifest', cliPathArg, '--json']);
  assert.equal(cliResult.status, expectedIsError ? 1 : 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);

  const mcp = createMcpClient();
  try {
    await initializeMcpClient(mcp);

    const mcpResponse = await mcp.request('tools/call', {
      name: 'validate_asset_manifest',
      arguments: {
        path: mcpPathArg
      }
    });

    assert.equal(mcpResponse.result.isError, expectedIsError);
    const mcpReport = mcpResponse.result.structuredContent;

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
    return { runtimeReport, cliReport, mcpReport };
  } finally {
    await mcp.close();
  }
}

test('AssetManifestValidationReport v1 stays strictly aligned across runtime, CLI and MCP for valid manifests', async () => {
  const { runtimeReport, cliReport, mcpReport } = await assertCliMcpParity({
    runtimePath: validAssetManifestPath,
    cliPathArg: validAssetManifestPath,
    mcpPathArg: './fixtures/assets/valid.asset-manifest.json',
    expectedIsError: false
  });

  assert.equal(runtimeReport.ok, true);
  assert.equal(cliReport.ok, true);
  assert.equal(mcpReport.ok, true);
  assert.equal(runtimeReport.assetManifestValidationReportVersion, 1);
  assert.deepEqual(runtimeReport.errors, []);
});

test('AssetManifestValidationReport v1 stays strictly aligned across runtime, CLI and MCP for parseable invalid manifests', async () => {
  const { runtimeReport, cliReport, mcpReport } = await assertCliMcpParity({
    runtimePath: invalidAssetManifestPath,
    cliPathArg: invalidAssetManifestPath,
    mcpPathArg: './fixtures/assets/invalid.traversal-src.asset-manifest.json',
    expectedIsError: true
  });

  assert.equal(runtimeReport.ok, false);
  assert.equal(cliReport.ok, false);
  assert.equal(mcpReport.ok, false);
  assert.deepEqual(runtimeReport.errors, [
    {
      path: '$.assets[0].src',
      message: 'must stay inside the manifest directory'
    }
  ]);
});

test('AssetManifestValidationReport v1 stays strictly aligned across runtime, CLI and MCP for malformed manifests', async () => {
  const { runtimeReport, cliReport, mcpReport } = await assertCliMcpParity({
    runtimePath: malformedAssetManifestPath,
    cliPathArg: malformedAssetManifestPath,
    mcpPathArg: './fixtures/assets/invalid-malformed.asset-manifest.json',
    expectedIsError: true
  });

  assert.equal(runtimeReport.ok, false);
  assert.equal(cliReport.ok, false);
  assert.equal(mcpReport.ok, false);
  assert.equal(runtimeReport.assetManifest, null);
  assert.deepEqual(runtimeReport.errors, [
    {
      path: '$',
      message: 'asset manifest JSON is malformed'
    }
  ]);
});

test('AssetManifestValidationReport v1 stays strictly aligned across runtime, CLI and MCP for missing manifests', async () => {
  const { runtimeReport, cliReport, mcpReport } = await assertCliMcpParity({
    runtimePath: missingAssetManifestPath,
    cliPathArg: missingAssetManifestPath,
    mcpPathArg: './fixtures/assets/missing.asset-manifest.json',
    expectedIsError: true
  });

  assert.equal(runtimeReport.ok, false);
  assert.equal(cliReport.ok, false);
  assert.equal(mcpReport.ok, false);
  assert.equal(runtimeReport.assetManifest, null);
  assert.deepEqual(runtimeReport.errors, [
    {
      path: '$',
      message: 'asset manifest file was not found'
    }
  ]);
});
