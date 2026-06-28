import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const serverPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');

function createClient() {
  const child = spawn(process.execPath, [serverPath], {
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

test('mcp inspect_ui_input_step is listed and returns deterministic input step reports', async () => {
  const client = createClient();

  try {
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

    const toolsResponse = await client.request('tools/list');
    const tool = toolsResponse.result.tools.find((entry) => entry.name === 'inspect_ui_input_step');
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ['path', 'inputIntentPath']);

    const reportResponse = await client.request('tools/call', {
      name: 'inspect_ui_input_step',
      arguments: {
        path: './scenes/ui-action-semantics.scene.json',
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    assert.equal(reportResponse.result.isError, false);
    const report = reportResponse.result.structuredContent;
    assert.equal(report.uiInputStepReportVersion, 1);
    assert.equal(report.scene, 'ui-action-semantics');
    assert.equal(report.scopePolicy, 'topmost-active-screen');
    assert.equal(report.inputIntentVersion, 1);
    assert.equal(report.inputIntentTick, 1);
    assert.equal(report.stepType, 'focus-move');
    assert.equal(report.direction, 1);
    assert.equal(report.inputHandled, true);
    assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
    assert.equal(report.focusedActionIdAfter, 'menu.continue-mission');
    assert.deepEqual(report.warnings.map((warning) => warning.code), ['ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS']);
  } finally {
    await client.close();
  }
});

test('mcp inspect_ui_input_step returns errors for invalid arguments', async () => {
  const client = createClient();

  try {
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

    const response = await client.request('tools/call', {
      name: 'inspect_ui_input_step',
      arguments: {
        path: './scenes/ui-action-semantics.scene.json'
      }
    });
    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /`inputIntentPath` is required/);
  } finally {
    await client.close();
  }
});
