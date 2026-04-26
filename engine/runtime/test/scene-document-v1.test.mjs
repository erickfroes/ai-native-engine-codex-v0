import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, validateLoopScene } from '../src/index.mjs';
import { assertSceneDocumentV1, assertSceneDocumentV1Rejects } from './helpers/assertSceneDocumentV1.mjs';
import { assertSceneValidationReportV1 } from './helpers/assertSceneValidationReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');

const tutorialPath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const loopablePath = path.join(repoRoot, 'scenes', 'loopable-minimal.scene.json');
const malformedPath = path.join(repoRoot, 'scenes', 'invalid', 'malformed.scene.json');
const missingSystemsPath = path.join(repoRoot, 'scenes', 'invalid', 'missing-systems.scene.json');
const emptySystemsPath = path.join(repoRoot, 'scenes', 'invalid', 'empty-systems.scene.json');
const unknownSystemPath = path.join(repoRoot, 'scenes', 'invalid', 'unknown-system.scene.json');
const visualSpriteFixturePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');

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

test('scene document v1: tutorial and loopable fixtures conform to expected shape', async () => {
  const tutorial = JSON.parse(await readFile(tutorialPath, 'utf8'));
  const loopable = JSON.parse(await readFile(loopablePath, 'utf8'));
  assertSceneDocumentV1(tutorial);
  assertSceneDocumentV1(loopable);

  await loadSceneFile(tutorialPath);
  await loadSceneFile(loopablePath);
});

test('scene document v1: visual sprite fixture stays valid and opt-in', async () => {
  const visualSprite = JSON.parse(await readFile(visualSpriteFixturePath, 'utf8'));
  assertSceneDocumentV1(visualSprite);

  const scene = await loadSceneFile(visualSpriteFixturePath);
  assert.equal(scene.metadata.name, 'visual-sprite-fixture');

  const report = await validateLoopScene(visualSpriteFixturePath);
  assertSceneValidationReportV1(report);
  assert.equal(report.valid, true);
});

test('scene document v1 helper rejects malformed/missing/empty systems shape when applicable', async () => {
  const missingSystems = JSON.parse(await readFile(missingSystemsPath, 'utf8'));
  const emptySystems = JSON.parse(await readFile(emptySystemsPath, 'utf8'));
  const unknownSystems = JSON.parse(await readFile(unknownSystemPath, 'utf8'));

  assertSceneDocumentV1Rejects(missingSystems);
  assertSceneDocumentV1Rejects(emptySystems);
  assertSceneDocumentV1(unknownSystems);
});

test('validateLoopScene keeps stable codes for invalid scene documents', async () => {
  const malformed = await validateLoopScene(malformedPath);
  const missing = await validateLoopScene(missingSystemsPath);
  const empty = await validateLoopScene(emptySystemsPath);
  const unknown = await validateLoopScene(unknownSystemPath);

  assertSceneValidationReportV1(malformed);
  assertSceneValidationReportV1(missing);
  assertSceneValidationReportV1(empty);
  assertSceneValidationReportV1(unknown);

  assert.ok(malformed.errors.some((error) => error.code === 'SCENE_JSON_MALFORMED'));
  assert.ok(missing.errors.some((error) => error.code === 'SCENE_SYSTEMS_MISSING'));
  assert.ok(empty.errors.some((error) => error.code === 'SCENE_SYSTEMS_EMPTY'));
  assert.ok(unknown.errors.some((error) => error.code === 'SCENE_SYSTEM_UNKNOWN'));
});

test('validate-scene --json and MCP validate_scene keep SceneValidationReport v1 contract', async () => {
  const cliValid = runCli(['validate-scene', tutorialPath, '--json']);
  assert.equal(cliValid.status, 0, cliValid.stderr);
  const cliValidReport = JSON.parse(cliValid.stdout);
  assertSceneValidationReportV1(cliValidReport);
  assert.equal(cliValidReport.valid, true);

  const cliInvalid = runCli(['validate-scene', unknownSystemPath, '--json']);
  assert.equal(cliInvalid.status, 1, cliInvalid.stderr);
  const cliInvalidReport = JSON.parse(cliInvalid.stdout);
  assertSceneValidationReportV1(cliInvalidReport);
  assert.ok(cliInvalidReport.errors.some((error) => error.code === 'SCENE_SYSTEM_UNKNOWN'));

  const mcp = createMcpClient();
  try {
    const init = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(init.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const validResponse = await mcp.request('tools/call', {
      name: 'validate_scene',
      arguments: { path: './scenes/tutorial.scene.json' }
    });
    assert.equal(validResponse.result.isError, false);
    assertSceneValidationReportV1(validResponse.result.structuredContent);

    const invalidResponse = await mcp.request('tools/call', {
      name: 'validate_scene',
      arguments: { path: './scenes/invalid/unknown-system.scene.json' }
    });
    assert.equal(invalidResponse.result.isError, true);
    assertSceneValidationReportV1(invalidResponse.result.structuredContent);
    assert.ok(
      invalidResponse.result.structuredContent.errors.some((error) => error.code === 'SCENE_SYSTEM_UNKNOWN')
    );
  } finally {
    await mcp.close();
  }
});

