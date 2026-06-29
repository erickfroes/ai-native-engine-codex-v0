import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildUiExplicitInputStepReportV1,
  loadValidatedUiExplicitInputV1,
  validateUiExplicitInputV1File
} from '../src/index.mjs';

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
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
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

async function assertUiExplicitInputValidationAligned(relativeInputPath, expectedIsError) {
  const absoluteInputPath = path.join(repoRoot, relativeInputPath);
  const runtimeReport = await validateUiExplicitInputV1File(absoluteInputPath);
  const cliResult = runCli(['validate-ui-explicit-input', absoluteInputPath, '--json']);
  assert.equal(cliResult.status, expectedIsError ? 1 : 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('validate_ui_explicit_input', {
    path: `./${relativeInputPath}`
  });

  assert.equal(mcpResponse.result.isError, expectedIsError);
  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  return runtimeReport;
}

async function assertUiExplicitInputStepAligned(relativeScenePath, relativeInputPath) {
  const absoluteScenePath = path.join(repoRoot, relativeScenePath);
  const absoluteInputPath = path.join(repoRoot, relativeInputPath);
  const uiExplicitInput = await loadValidatedUiExplicitInputV1(absoluteInputPath);
  const runtimeReport = await buildUiExplicitInputStepReportV1(absoluteScenePath, { uiExplicitInput });
  const cliResult = runCli([
    'inspect-ui-explicit-input-step',
    absoluteScenePath,
    '--ui-explicit-input',
    absoluteInputPath,
    '--json'
  ]);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_ui_explicit_input_step', {
    path: `./${relativeScenePath}`,
    uiExplicitInputPath: `./${relativeInputPath}`
  });

  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  return runtimeReport;
}

test('UiExplicitInput v1 validation stays aligned across runtime, CLI and MCP', async () => {
  const validReport = await assertUiExplicitInputValidationAligned(
    'fixtures/ui-input/navigate-next.ui-explicit-input.json',
    false
  );
  const invalidReport = await assertUiExplicitInputValidationAligned(
    'fixtures/ui-input/invalid.version.ui-explicit-input.json',
    true
  );

  assert.equal(validReport.ok, true);
  assert.equal(invalidReport.ok, false);
  assert.ok(
    invalidReport.errors.some((error) => error.path === '$.uiExplicitInputVersion' && error.message === 'must be 1')
  );
});

test('UiExplicitInputStepReport v1 stays aligned across runtime, CLI and MCP for navigate next', async () => {
  const report = await assertUiExplicitInputStepAligned(
    'scenes/ui-action-semantics.scene.json',
    'fixtures/ui-input/navigate-next.ui-explicit-input.json'
  );

  assert.equal(report.stepType, 'focus-move');
  assert.equal(report.direction, 1);
  assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
});

test('UiExplicitInputStepReport v1 stays aligned across runtime, CLI and MCP for activate', async () => {
  const report = await assertUiExplicitInputStepAligned(
    'scenes/ui-action-semantics.scene.json',
    'fixtures/ui-input/activate.ui-explicit-input.json'
  );

  assert.equal(report.stepType, 'activate');
  assert.equal(report.direction, 0);
  assert.equal(report.activatedActionId, 'menu.start-mission');
});

test('UiExplicitInputStepReport v1 stays aligned for no-action and no-UI scenes', async () => {
  const noActionReport = await assertUiExplicitInputStepAligned(
    'scenes/ui-production-screens.scene.json',
    'fixtures/ui-input/navigate-next.ui-explicit-input.json'
  );
  const noUiReport = await assertUiExplicitInputStepAligned(
    'scenes/tutorial.scene.json',
    'fixtures/ui-input/activate.ui-explicit-input.json'
  );

  assert.equal(noActionReport.stepType, 'noop');
  assert.equal(noUiReport.stepType, 'noop');
  assert.equal(noUiReport.focusedScreenId, null);
});

test('UiExplicitInputStepReport v1 invalid scenes and inputs fail predictably across interfaces', async () => {
  const relativeScenePath = 'engine/runtime/test/fixtures/invalid_ui_screen_widget.scene.json';
  const relativeInputPath = 'fixtures/ui-input/navigate-next.ui-explicit-input.json';
  const absoluteScenePath = path.join(repoRoot, relativeScenePath);
  const absoluteInputPath = path.join(repoRoot, relativeInputPath);
  const uiExplicitInput = await loadValidatedUiExplicitInputV1(absoluteInputPath);

  await assert.rejects(
    () => buildUiExplicitInputStepReportV1(absoluteScenePath, { uiExplicitInput }),
    /Scene validation failed/
  );

  const sceneCliResult = runCli([
    'inspect-ui-explicit-input-step',
    absoluteScenePath,
    '--ui-explicit-input',
    absoluteInputPath,
    '--json'
  ]);
  assert.notEqual(sceneCliResult.status, 0);
  assert.match(sceneCliResult.stderr, /Scene validation failed/);

  const sceneMcpResponse = await callMcpTool('inspect_ui_explicit_input_step', {
    path: `./${relativeScenePath}`,
    uiExplicitInputPath: `./${relativeInputPath}`
  });
  assert.equal(sceneMcpResponse.result.isError, true);
  assert.match(sceneMcpResponse.result.content[0].text, /Scene validation failed/);

  const invalidInputPath = path.join(repoRoot, 'fixtures', 'ui-input', 'invalid.version.ui-explicit-input.json');
  const inputCliResult = runCli([
    'inspect-ui-explicit-input-step',
    path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json'),
    '--ui-explicit-input',
    invalidInputPath
  ]);
  assert.notEqual(inputCliResult.status, 0);
  assert.match(inputCliResult.stderr, /ui explicit input is invalid/);

  const inputMcpResponse = await callMcpTool('inspect_ui_explicit_input_step', {
    path: './scenes/ui-action-semantics.scene.json',
    uiExplicitInputPath: './fixtures/ui-input/invalid.version.ui-explicit-input.json'
  });
  assert.equal(inputMcpResponse.result.isError, true);
  assert.match(inputMcpResponse.result.content[0].text, /ui explicit input is invalid/);
});
