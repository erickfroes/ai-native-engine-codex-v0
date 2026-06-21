import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildPrefabUsageReportV2 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');

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

async function assertPrefabInterfacesAlignedV2(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const runtimeReport = await buildPrefabUsageReportV2(absolutePath);
  const cliResult = runCli(['inspect-prefab-usage-v2', absolutePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_prefab_usage_v2', {
    path: `./${relativePath.replaceAll('\\', '/')}`
  });

  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  return runtimeReport;
}

test('PrefabUsageReport v2 stays aligned across runtime, CLI and MCP for prefab-instanced scenes', async () => {
  const report = await assertPrefabInterfacesAlignedV2('scenes/prefab-instanced.scene.json');

  assert.equal(report.prefabUsageReportVersion, 2);
  assert.equal(report.prefabs.length, 3);
  assert.equal(report.prefabs[0].entityId, 'player.hero');
  assert.deepEqual(report.prefabs[0].overrides, []);
  assert.deepEqual(report.prefabs[1].overrides, [
    {
      kind: 'transform',
      entityComponentPath: '$.entities[1].components[0]',
      prefabComponentPath: '$.components[0]',
      resolvedComponentPath: '$.entities[1].components[0]'
    }
  ]);
});

test('PrefabUsageReport v2 stays aligned when prefab-backed entities omit explicit components', async () => {
  const report = await assertPrefabInterfacesAlignedV2('engine/runtime/test/fixtures/prefab-usage-prefab-only.scene.json');

  assert.equal(report.prefabs.length, 1);
  assert.deepEqual(report.prefabs[0].components, [
    {
      kind: 'transform',
      source: 'prefab',
      sourceComponentPath: '$.components[0]',
      resolvedComponentPath: '$.entities[0].components[0]'
    },
    {
      kind: 'visual.sprite',
      source: 'prefab',
      sourceComponentPath: '$.components[1]',
      resolvedComponentPath: '$.entities[0].components[1]'
    },
    {
      kind: 'collision.bounds',
      source: 'prefab',
      sourceComponentPath: '$.components[2]',
      resolvedComponentPath: '$.entities[0].components[2]'
    }
  ]);
  assert.deepEqual(report.prefabs[0].overrides, []);
});

test('PrefabUsageReport v2 invalid prefab scenes fail predictably across runtime, CLI and MCP', async () => {
  const relativePath = 'engine/runtime/test/fixtures/invalid_prefab_missing.scene.json';
  const absolutePath = path.join(repoRoot, relativePath);

  await assert.rejects(
    () => buildPrefabUsageReportV2(absolutePath),
    /Scene validation failed/
  );

  const cliResult = runCli(['inspect-prefab-usage-v2', absolutePath, '--json']);
  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /Scene validation failed/);

  const mcpResponse = await callMcpTool('inspect_prefab_usage_v2', {
    path: `./${relativePath}`
  });
  assert.equal(mcpResponse.result.isError, true);
  assert.match(mcpResponse.result.content[0].text, /Scene validation failed/);
});

test('PrefabUsageReport v2 fails predictably across runtime, CLI and MCP for unsafe prefab path references', async () => {
  const relativePath = 'engine/runtime/test/fixtures/invalid_prefab_unsafe_paths.scene.json';
  const absolutePath = path.join(repoRoot, relativePath);

  await assert.rejects(
    () => buildPrefabUsageReportV2(absolutePath),
    /Scene validation failed/
  );

  const cliResult = runCli(['inspect-prefab-usage-v2', absolutePath, '--json']);
  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /Scene validation failed/);

  const mcpResponse = await callMcpTool('inspect_prefab_usage_v2', {
    path: `./${relativePath}`
  });
  assert.equal(mcpResponse.result.isError, true);
  assert.match(mcpResponse.result.content[0].text, /Scene validation failed/);
});
