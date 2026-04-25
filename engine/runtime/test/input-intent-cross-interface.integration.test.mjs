import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { createInputIntentFromKeyboardV1, validateInputIntentV1File } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const validIntentPath = './fixtures/input/valid.move.intent.json';
const invalidIntentPath = './fixtures/input/invalid.axis-above-max.intent.json';
const expectedReportKeys = ['absolutePath', 'errors', 'inputIntent', 'ok'];
const expectedErrorKeys = ['message', 'path'];

function normalizeInputIntentValidationReport(report) {
  return {
    ok: report.ok,
    absolutePath: report.absolutePath,
    inputIntent: report.inputIntent,
    errors: report.errors
  };
}

function assertReportShape(report) {
  assert.deepEqual(Object.keys(report).sort(), expectedReportKeys);
  assert.equal(typeof report.absolutePath, 'string');
  assert.equal(typeof report.ok, 'boolean');
  assert.equal(typeof report.inputIntent, 'object');
  assert.ok(Array.isArray(report.errors));

  for (const error of report.errors) {
    assert.deepEqual(Object.keys(error).sort(), expectedErrorKeys);
  }
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

async function assertCliMcpParity(intentPath, expectedIsError) {
  const cliResult = runCli(['validate-input-intent', intentPath, '--json']);
  assert.equal(cliResult.status, expectedIsError ? 1 : 0, cliResult.stderr);

  const cliReport = normalizeInputIntentValidationReport(JSON.parse(cliResult.stdout));
  assertReportShape(cliReport);

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
      name: 'validate_input_intent',
      arguments: {
        path: intentPath
      }
    });

    assert.equal(mcpResponse.result.isError, expectedIsError);

    const mcpReport = normalizeInputIntentValidationReport(mcpResponse.result.structuredContent);
    assertReportShape(mcpReport);

    assert.deepEqual(cliReport, mcpReport);
    return { cliReport, mcpReport };
  } finally {
    await mcp.close();
  }
}

test('validate_input_intent valid report stays semantically aligned across CLI and MCP', async () => {
  const { cliReport, mcpReport } = await assertCliMcpParity(validIntentPath, false);

  assert.equal(cliReport.ok, true);
  assert.equal(mcpReport.ok, true);
  assert.deepEqual(cliReport.errors, []);
  assert.equal(cliReport.absolutePath, path.join(repoRoot, 'fixtures', 'input', 'valid.move.intent.json'));
  assert.deepEqual(
    cliReport.inputIntent.actions.map((action) => `${action.type}:${action.axis.x},${action.axis.y}`),
    ['move:1,0', 'move:0,-1']
  );
});

test('validate_input_intent invalid axis-above-max report stays semantically aligned across CLI and MCP', async () => {
  const { cliReport, mcpReport } = await assertCliMcpParity(invalidIntentPath, true);

  assert.equal(cliReport.ok, false);
  assert.equal(mcpReport.ok, false);
  assert.equal(
    cliReport.absolutePath,
    path.join(repoRoot, 'fixtures', 'input', 'invalid.axis-above-max.intent.json')
  );
  assert.ok(
    cliReport.errors.some(
      (error) => error.path === '$.actions[0].axis.x' && error.message === 'must be <= 1'
    )
  );
  assert.deepEqual(cliReport.errors, [
    {
      path: '$.actions[0].axis.x',
      message: 'must be <= 1'
    }
  ]);
});

test('keyboard input intent generation stays semantically aligned across runtime, CLI and MCP', async () => {
  const runtimeFirst = createInputIntentFromKeyboardV1({
    tick: 1,
    entityId: 'player',
    keys: ['ArrowRight', 'ArrowUp']
  });
  const runtimeSecond = createInputIntentFromKeyboardV1({
    tick: 1,
    entityId: 'player',
    keys: ['ArrowRight', 'ArrowUp']
  });
  const cliFirst = runCli([
    'keyboard-to-input-intent',
    '--tick',
    '1',
    '--entity',
    'player',
    '--keys',
    'ArrowRight,ArrowUp',
    '--json'
  ]);
  const cliSecond = runCli([
    'keyboard-to-input-intent',
    '--tick',
    '1',
    '--entity',
    'player',
    '--keys',
    'ArrowRight,ArrowUp',
    '--json'
  ]);

  assert.equal(cliFirst.status, 0, cliFirst.stderr);
  assert.equal(cliSecond.status, 0, cliSecond.stderr);

  const cliFirstIntent = JSON.parse(cliFirst.stdout);
  const cliSecondIntent = JSON.parse(cliSecond.stdout);
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

    const mcpFirst = await mcp.request('tools/call', {
      name: 'keyboard_to_input_intent',
      arguments: {
        tick: 1,
        entityId: 'player',
        keys: ['ArrowRight', 'ArrowUp']
      }
    });
    const mcpSecond = await mcp.request('tools/call', {
      name: 'keyboard_to_input_intent',
      arguments: {
        tick: 1,
        entityId: 'player',
        keys: ['ArrowRight', 'ArrowUp']
      }
    });

    assert.equal(mcpFirst.result.isError, false);
    assert.equal(mcpSecond.result.isError, false);

    assert.deepEqual(runtimeFirst, runtimeSecond);
    assert.deepEqual(runtimeFirst, cliFirstIntent);
    assert.deepEqual(cliFirstIntent, cliSecondIntent);
    assert.deepEqual(cliFirstIntent, mcpFirst.result.structuredContent);
    assert.deepEqual(mcpFirst.result.structuredContent, mcpSecond.result.structuredContent);
  } finally {
    await mcp.close();
  }
});

test('generated keyboard input intent passes validation across runtime, CLI and MCP', async () => {
  const tempDir = await mkdtemp(path.join(repoRoot, '.tmp-keyboard-input-intent-'));
  const generatedIntentPath = path.join(tempDir, 'generated.keyboard.intent.json');
  const inputIntent = createInputIntentFromKeyboardV1({
    tick: 1,
    entityId: 'player',
    keys: ['ArrowRight', 'ArrowUp']
  });

  try {
    await writeFile(generatedIntentPath, JSON.stringify(inputIntent, null, 2), 'utf8');

    const runtimeReport = normalizeInputIntentValidationReport(
      await validateInputIntentV1File(generatedIntentPath)
    );
    assertReportShape(runtimeReport);
    assert.equal(runtimeReport.ok, true);

    const cliResult = runCli(['validate-input-intent', generatedIntentPath, '--json']);
    assert.equal(cliResult.status, 0, cliResult.stderr);

    const cliReport = normalizeInputIntentValidationReport(JSON.parse(cliResult.stdout));
    assertReportShape(cliReport);

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
        name: 'validate_input_intent',
        arguments: {
          path: generatedIntentPath
        }
      });

      assert.equal(mcpResponse.result.isError, false);
      const mcpReport = normalizeInputIntentValidationReport(mcpResponse.result.structuredContent);
      assertReportShape(mcpReport);

      assert.deepEqual(runtimeReport, cliReport);
      assert.deepEqual(cliReport, mcpReport);
    } finally {
      await mcp.close();
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
