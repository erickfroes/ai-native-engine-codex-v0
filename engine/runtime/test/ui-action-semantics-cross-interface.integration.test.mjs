import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildUiActionSemanticsReportV1 } from '../src/index.mjs';

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

async function assertUiActionSemanticsInterfacesAligned(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const runtimeReport = await buildUiActionSemanticsReportV1(absolutePath);
  const cliResult = runCli(['inspect-ui-action-semantics', absolutePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_ui_action_semantics', {
    path: `./${relativePath.replaceAll('\\', '/')}`
  });

  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  return runtimeReport;
}

test('UiActionSemanticsReport v1 stays aligned across runtime, CLI and MCP for scenes without ui.screen', async () => {
  const report = await assertUiActionSemanticsInterfacesAligned('scenes/tutorial.scene.json');

  assert.equal(report.focusedScreenId, null);
  assert.deepEqual(report.actions, []);
  assert.deepEqual(report.warnings.map((warning) => warning.code), ['NO_ACTIVE_SCREEN']);
});

test('UiActionSemanticsReport v1 stays aligned across runtime, CLI and MCP for scenes with no authored semantics', async () => {
  const report = await assertUiActionSemanticsInterfacesAligned('scenes/ui-production-screens.scene.json');

  assert.equal(report.focusedScreenId, 'menu.main');
  assert.deepEqual(report.actions, []);
  assert.deepEqual(report.warnings.map((warning) => warning.code), ['NO_ACTION_SEMANTICS']);
});

test('UiActionSemanticsReport v1 stays aligned across runtime, CLI and MCP for authored action scenes', async () => {
  const report = await assertUiActionSemanticsInterfacesAligned('scenes/ui-action-semantics.scene.json');

  assert.equal(report.focusedScreenId, 'menu.main');
  assert.equal(report.initialFocusWidgetId, 'menu.start');
  assert.deepEqual(report.actions.map((action) => action.actionId), [
    'menu.start-mission',
    'menu.continue-mission'
  ]);
});

test('UiActionSemanticsReport v1 invalid scenes fail predictably across runtime, CLI and MCP', async () => {
  const relativePath = 'engine/runtime/test/fixtures/invalid_ui_action_semantics.scene.json';
  const absolutePath = path.join(repoRoot, relativePath);

  await assert.rejects(
    () => buildUiActionSemanticsReportV1(absolutePath),
    /Scene validation failed/
  );

  const cliResult = runCli(['inspect-ui-action-semantics', absolutePath, '--json']);
  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /Scene validation failed/);

  const mcpResponse = await callMcpTool('inspect_ui_action_semantics', {
    path: `./${relativePath}`
  });
  assert.equal(mcpResponse.result.isError, true);
  assert.match(mcpResponse.result.content[0].text, /Scene validation failed/);
});
