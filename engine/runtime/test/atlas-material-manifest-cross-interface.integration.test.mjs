import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildAtlasMaterialManifestReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'atlas-material');
const validManifestPath = path.join(fixtureDir, 'starter.atlas-material.json');
const invalidManifestPath = path.join(fixtureDir, 'invalid-missing-region-or-material-ref.atlas-material.json');
const malformedManifestPath = path.join(fixtureDir, 'invalid-malformed.atlas-material.json');
const missingManifestPath = path.join(fixtureDir, 'missing.atlas-material.json');

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
  const runtimeReport = await buildAtlasMaterialManifestReportV1(runtimePath);

  const cliResult = runCli(['inspect-atlas-material-manifest', cliPathArg, '--json']);
  assert.equal(cliResult.status, expectedIsError ? 1 : 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);

  const mcp = createMcpClient();
  try {
    await initializeMcpClient(mcp);

    const mcpResponse = await mcp.request('tools/call', {
      name: 'inspect_atlas_material_manifest',
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

test('AtlasMaterialManifestReport v1 stays aligned across runtime, CLI and MCP for valid manifests', async () => {
  const { runtimeReport } = await assertCliMcpParity({
    runtimePath: validManifestPath,
    cliPathArg: validManifestPath,
    mcpPathArg: './engine/runtime/test/fixtures/atlas-material/starter.atlas-material.json',
    expectedIsError: false
  });

  assert.equal(runtimeReport.ok, true);
  assert.equal(runtimeReport.atlasMaterialManifestReportVersion, 1);
  assert.deepEqual(runtimeReport.errors, []);
});

test('AtlasMaterialManifestReport v1 stays aligned across runtime, CLI and MCP for parseable invalid manifests', async () => {
  const { runtimeReport } = await assertCliMcpParity({
    runtimePath: invalidManifestPath,
    cliPathArg: invalidManifestPath,
    mcpPathArg: './engine/runtime/test/fixtures/atlas-material/invalid-missing-region-or-material-ref.atlas-material.json',
    expectedIsError: true
  });

  assert.equal(runtimeReport.ok, false);
  assert.ok(runtimeReport.errors.some((error) => error.target === 'spriteBinding'));
});

test('AtlasMaterialManifestReport v1 stays aligned across runtime, CLI and MCP for malformed manifests', async () => {
  const { runtimeReport } = await assertCliMcpParity({
    runtimePath: malformedManifestPath,
    cliPathArg: malformedManifestPath,
    mcpPathArg: './engine/runtime/test/fixtures/atlas-material/invalid-malformed.atlas-material.json',
    expectedIsError: true
  });

  assert.equal(runtimeReport.ok, false);
  assert.equal(runtimeReport.manifest, null);
  assert.deepEqual(runtimeReport.errors, [
    {
      target: 'manifest',
      ref: null,
      path: '$',
      message: 'atlas/material manifest JSON is malformed'
    }
  ]);
});

test('AtlasMaterialManifestReport v1 stays aligned across runtime, CLI and MCP for missing manifests', async () => {
  const { runtimeReport } = await assertCliMcpParity({
    runtimePath: missingManifestPath,
    cliPathArg: missingManifestPath,
    mcpPathArg: './engine/runtime/test/fixtures/atlas-material/missing.atlas-material.json',
    expectedIsError: true
  });

  assert.equal(runtimeReport.ok, false);
  assert.equal(runtimeReport.manifest, null);
  assert.deepEqual(runtimeReport.errors, [
    {
      target: 'manifest',
      ref: null,
      path: '$',
      message: 'atlas/material manifest file was not found'
    }
  ]);
});
