import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateLoopScene } from '../src/index.mjs';
import { assertSceneValidationReportV1 } from './helpers/assertSceneValidationReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const missingSystemsPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_missing_systems.scene.json');
const emptySystemsPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_empty_systems.scene.json');
const unknownSystemPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_unknown_system.scene.json');
const malformedPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_malformed.scene.json');
const fileNotFoundPath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'does-not-exist.scene.json');

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

async function assertCrossInterfaceReportSemantics(scenePath, expected) {
  const runtimeReport = await validateLoopScene(scenePath);
  assertSceneValidationReportV1(runtimeReport);

  const cliResult = runCli(['validate-scene', scenePath, '--json']);
  const cliReport = JSON.parse(cliResult.stdout);
  assertSceneValidationReportV1(cliReport);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpResponse = await mcp.request('tools/call', {
      name: 'validate_scene',
      arguments: { path: scenePath }
    });
    const mcpReport = mcpResponse.result.structuredContent;
    assertSceneValidationReportV1(mcpReport);

    assert.equal(runtimeReport.valid, expected.valid);
    assert.equal(cliReport.valid, expected.valid);
    assert.equal(mcpReport.valid, expected.valid);

    if (expected.code) {
      assert.ok(runtimeReport.errors.some((error) => error.code === expected.code));
      assert.ok(cliReport.errors.some((error) => error.code === expected.code));
      assert.ok(mcpReport.errors.some((error) => error.code === expected.code));
    }

    if (expected.system) {
      assert.ok(runtimeReport.errors.some((error) => error.system === expected.system));
      assert.ok(cliReport.errors.some((error) => error.system === expected.system));
      assert.ok(mcpReport.errors.some((error) => error.system === expected.system));
    }

    assert.deepEqual(runtimeReport, cliReport);
    assert.deepEqual(runtimeReport, mcpReport);
  } finally {
    await mcp.close();
  }
}

test('scene validation report v1 is valid for tutorial scene across runtime, CLI and MCP', async () => {
  await assertCrossInterfaceReportSemantics(tutorialScenePath, { valid: true });
  const report = await validateLoopScene(tutorialScenePath);
  assert.equal(report.errors.length, 0);
  assert.deepEqual(
    report.systems.map((system) => [system.name, system.known, system.delta]),
    [
      ['core.loop', true, 1],
      ['input.keyboard', true, 3],
      ['networking.replication', true, 2]
    ]
  );
});

test('scene validation report v1 returns SCENE_FILE_NOT_FOUND for missing scene', async () => {
  await assertCrossInterfaceReportSemantics(fileNotFoundPath, {
    valid: false,
    code: 'SCENE_FILE_NOT_FOUND'
  });
});

test('scene validation report v1 returns SCENE_JSON_MALFORMED for malformed JSON', async () => {
  await assertCrossInterfaceReportSemantics(malformedPath, {
    valid: false,
    code: 'SCENE_JSON_MALFORMED'
  });
});

test('scene validation report v1 returns systems missing/empty codes', async () => {
  await assertCrossInterfaceReportSemantics(missingSystemsPath, {
    valid: false,
    code: 'SCENE_SYSTEMS_MISSING'
  });
  await assertCrossInterfaceReportSemantics(emptySystemsPath, {
    valid: false,
    code: 'SCENE_SYSTEMS_EMPTY'
  });
});

test('scene validation report v1 returns SCENE_SYSTEM_UNKNOWN with system name', async () => {
  await assertCrossInterfaceReportSemantics(unknownSystemPath, {
    valid: false,
    code: 'SCENE_SYSTEM_UNKNOWN',
    system: 'unknown.system'
  });
});

