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

async function withInitializedClient(fn) {
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
    return await fn(client);
  } finally {
    await client.close();
  }
}

test('mcp UI explicit input tools are listed and validate explicit input payloads', async () => {
  await withInitializedClient(async (client) => {
    const toolsResponse = await client.request('tools/list');
    const validateTool = toolsResponse.result.tools.find((entry) => entry.name === 'validate_ui_explicit_input');
    const keyboardTool = toolsResponse.result.tools.find((entry) => entry.name === 'keyboard_to_ui_explicit_input');
    const inspectTool = toolsResponse.result.tools.find((entry) => entry.name === 'inspect_ui_explicit_input_step');

    assert.ok(validateTool);
    assert.deepEqual(validateTool.inputSchema.required, ['path']);
    assert.ok(keyboardTool);
    assert.deepEqual(keyboardTool.inputSchema.required, ['tick', 'keys']);
    assert.ok(inspectTool);
    assert.deepEqual(inspectTool.inputSchema.required, ['path', 'uiExplicitInputPath']);

    const validResponse = await client.request('tools/call', {
      name: 'validate_ui_explicit_input',
      arguments: {
        path: './fixtures/ui-input/navigate-next.ui-explicit-input.json'
      }
    });
    const invalidResponse = await client.request('tools/call', {
      name: 'validate_ui_explicit_input',
      arguments: {
        path: './fixtures/ui-input/invalid.version.ui-explicit-input.json'
      }
    });

    assert.equal(validResponse.result.isError, false);
    assert.equal(validResponse.result.structuredContent.ok, true);
    assert.deepEqual(validResponse.result.structuredContent.errors, []);
    assert.equal(invalidResponse.result.isError, true);
    assert.equal(invalidResponse.result.structuredContent.ok, false);
    assert.ok(
      invalidResponse.result.structuredContent.errors.some(
        (error) => error.path === '$.uiExplicitInputVersion' && error.message === 'must be 1'
      )
    );
  });
});

test('mcp keyboard_to_ui_explicit_input returns deterministic payloads and errors', async () => {
  await withInitializedClient(async (client) => {
    const nextResponse = await client.request('tools/call', {
      name: 'keyboard_to_ui_explicit_input',
      arguments: {
        tick: 1,
        keys: ['ArrowRight']
      }
    });
    const activateResponse = await client.request('tools/call', {
      name: 'keyboard_to_ui_explicit_input',
      arguments: {
        tick: 2,
        keys: ['Enter']
      }
    });
    const invalidResponse = await client.request('tools/call', {
      name: 'keyboard_to_ui_explicit_input',
      arguments: {
        tick: 1,
        keys: []
      }
    });

    assert.equal(nextResponse.result.isError, false);
    assert.deepEqual(nextResponse.result.structuredContent, {
      uiExplicitInputVersion: 1,
      tick: 1,
      action: {
        type: 'navigate',
        direction: 'next'
      }
    });
    assert.equal(activateResponse.result.isError, false);
    assert.deepEqual(activateResponse.result.structuredContent, {
      uiExplicitInputVersion: 1,
      tick: 2,
      action: {
        type: 'activate'
      }
    });
    assert.equal(invalidResponse.result.isError, true);
    assert.match(invalidResponse.result.content[0].text, /`keys` is required/);
  });
});

test('mcp inspect_ui_explicit_input_step returns deterministic reports and argument errors', async () => {
  await withInitializedClient(async (client) => {
    const reportResponse = await client.request('tools/call', {
      name: 'inspect_ui_explicit_input_step',
      arguments: {
        path: './scenes/ui-action-semantics.scene.json',
        uiExplicitInputPath: './fixtures/ui-input/navigate-next.ui-explicit-input.json'
      }
    });
    const missingInputResponse = await client.request('tools/call', {
      name: 'inspect_ui_explicit_input_step',
      arguments: {
        path: './scenes/ui-action-semantics.scene.json'
      }
    });
    const unexpectedArgumentResponse = await client.request('tools/call', {
      name: 'inspect_ui_explicit_input_step',
      arguments: {
        path: './scenes/ui-action-semantics.scene.json',
        uiExplicitInputPath: './fixtures/ui-input/navigate-next.ui-explicit-input.json',
        debug: true
      }
    });

    assert.equal(reportResponse.result.isError, false);
    const report = reportResponse.result.structuredContent;
    assert.equal(report.uiExplicitInputStepReportVersion, 1);
    assert.equal(report.scene, 'ui-action-semantics');
    assert.equal(report.actionType, 'navigate');
    assert.equal(report.stepType, 'focus-move');
    assert.equal(report.direction, 1);
    assert.equal(report.inputHandled, true);
    assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
    assert.equal(report.focusedActionIdAfter, 'menu.continue-mission');
    assert.equal(missingInputResponse.result.isError, true);
    assert.match(missingInputResponse.result.content[0].text, /`uiExplicitInputPath` is required/);
    assert.equal(unexpectedArgumentResponse.result.isError, true);
    assert.match(unexpectedArgumentResponse.result.content[0].text, /unexpected argument `debug`/);
  });
});
