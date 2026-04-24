import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import { loadSceneFile, runMinimalSystemLoop } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

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

function normalizeError(raw) {
  const text = String(raw ?? '').toLowerCase();
  return {
    mentionsTicks: text.includes('ticks'),
    mentionsInteger: text.includes('integer'),
    mentionsNoEnt: text.includes('enoent'),
    mentionsSyntax: text.includes('syntax'),
    mentionsUnexpected: text.includes('unexpected')
  };
}

test('run-loop tick validation contract stays stable across runtime, CLI and MCP', async () => {
  const scene = await loadSceneFile(tutorialScenePath);

  const runtimeTicksZero = runMinimalSystemLoop(scene, { ticks: 0, seed: 10 });
  assert.equal(runtimeTicksZero.ticksExecuted, 0);
  assert.equal(runtimeTicksZero.finalState, 10);
  assert.deepEqual(runtimeTicksZero.executedSystems, []);

  const cliTicksZero = runCli(['run-loop', tutorialScenePath, '--ticks', '0', '--seed', '10', '--json']);
  assert.equal(cliTicksZero.status, 0, cliTicksZero.stderr);
  const cliTicksZeroReport = JSON.parse(cliTicksZero.stdout);
  assert.equal(cliTicksZeroReport.ticksExecuted, 0);
  assert.equal(cliTicksZeroReport.finalState, 10);
  assert.deepEqual(cliTicksZeroReport.executedSystems, []);

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpTicksZero = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 0,
        seed: 10
      }
    });
    assert.equal(mcpTicksZero.result.isError, false);
    assert.equal(mcpTicksZero.result.structuredContent.ticksExecuted, 0);
    assert.equal(mcpTicksZero.result.structuredContent.finalState, 10);
    assert.deepEqual(mcpTicksZero.result.structuredContent.executedSystems, []);

    assert.throws(() => runMinimalSystemLoop(scene, { ticks: -1, seed: 10 }), /ticks must be an integer >= 0/);
    assert.throws(() => runMinimalSystemLoop(scene, { ticks: 1.5, seed: 10 }), /ticks must be an integer >= 0/);

    const cliTicksNegative = runCli(['run-loop', tutorialScenePath, '--ticks', '-1', '--seed', '10', '--json']);
    assert.notEqual(cliTicksNegative.status, 0);
    const cliNegativeError = normalizeError(cliTicksNegative.stderr);
    assert.equal(cliNegativeError.mentionsTicks, true);
    assert.equal(cliNegativeError.mentionsInteger, true);

    const cliTicksNonInteger = runCli(['run-loop', tutorialScenePath, '--ticks', 'abc', '--seed', '10', '--json']);
    assert.notEqual(cliTicksNonInteger.status, 0);
    const cliNonIntegerError = normalizeError(cliTicksNonInteger.stderr);
    assert.equal(cliNonIntegerError.mentionsTicks, true);
    assert.equal(cliNonIntegerError.mentionsInteger, true);

    const mcpTicksNegative = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: -1,
        seed: 10
      }
    });
    assert.equal(mcpTicksNegative.result.isError, true);
    const mcpNegativeError = normalizeError(mcpTicksNegative.result.content?.[0]?.text);
    assert.equal(mcpNegativeError.mentionsTicks, true);
    assert.equal(mcpNegativeError.mentionsInteger, true);

    const mcpTicksNonInteger = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 'abc',
        seed: 10
      }
    });
    assert.equal(mcpTicksNonInteger.result.isError, true);
    const mcpNonIntegerError = normalizeError(mcpTicksNonInteger.result.content?.[0]?.text);
    assert.equal(mcpNonIntegerError.mentionsTicks, true);
    assert.equal(mcpNonIntegerError.mentionsInteger, true);
  } finally {
    await mcp.close();
  }
});

test('run-loop scene loading and validation errors stay predictable across runtime, CLI and MCP', async () => {
  const missingScenePath = path.join(repoRoot, 'scenes', 'does-not-exist.scene.json');
  const relativeMissingPath = './scenes/does-not-exist.scene.json';

  await assert.rejects(() => loadSceneFile(missingScenePath), /ENOENT/);

  const cliMissing = runCli(['run-loop', missingScenePath, '--ticks', '4', '--seed', '10', '--json']);
  assert.notEqual(cliMissing.status, 0);
  const cliMissingError = normalizeError(cliMissing.stderr);
  assert.equal(cliMissingError.mentionsNoEnt, true);

  const tempDir = await mkdtemp(path.join(repoRoot, '.tmp-loop-cross-interface-'));
  const malformedScenePath = path.join(tempDir, 'malformed.scene.json');
  const noSystemsScenePath = path.join(tempDir, 'no-systems.scene.json');
  const unknownSystemScenePath = path.join(tempDir, 'unknown-system.scene.json');
  const relativeMalformedPath = `./${path.relative(repoRoot, malformedScenePath)}`;
  const relativeNoSystemsPath = `./${path.relative(repoRoot, noSystemsScenePath)}`;
  const relativeUnknownSystemPath = `./${path.relative(repoRoot, unknownSystemScenePath)}`;

  await writeFile(malformedScenePath, '{ "version": 1, "metadata": { "name": "broken" }, ', 'utf8');
  await writeFile(noSystemsScenePath, JSON.stringify({
    version: 1,
    metadata: { name: 'no-systems' },
    entities: [{ id: 'entity-a', components: [{ kind: 'transform', version: 1, replicated: false, fields: {} }] }]
  }, null, 2), 'utf8');
  await writeFile(unknownSystemScenePath, JSON.stringify({
    version: 1,
    metadata: { name: 'unknown-system' },
    systems: ['unknown.system'],
    entities: [{ id: 'entity-a', components: [{ kind: 'transform', version: 1, replicated: false, fields: {} }] }]
  }, null, 2), 'utf8');

  const mcp = createMcpClient();
  try {
    const initResponse = await mcp.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'node-test', version: '1.0.0' }
    });
    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    mcp.notify('notifications/initialized');

    const mcpMissing = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: relativeMissingPath,
        ticks: 4,
        seed: 10
      }
    });
    assert.equal(mcpMissing.result.isError, true);
    assert.equal(normalizeError(mcpMissing.result.content?.[0]?.text).mentionsNoEnt, true);

    await assert.rejects(() => loadSceneFile(malformedScenePath), {
      name: 'SyntaxError'
    });

    const cliMalformed = runCli(['run-loop', malformedScenePath, '--ticks', '4', '--seed', '10', '--json']);
    assert.notEqual(cliMalformed.status, 0);
    const cliMalformedError = normalizeError(cliMalformed.stderr);
    assert.equal(cliMalformedError.mentionsUnexpected || cliMalformedError.mentionsSyntax, true);

    const mcpMalformed = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: relativeMalformedPath,
        ticks: 4,
        seed: 10
      }
    });
    assert.equal(mcpMalformed.result.isError, true);
    assert.equal(mcpMalformed.result.structuredContent.errorName, 'SyntaxError');

    const runtimeNoSystems = runMinimalSystemLoop(await loadSceneFile(noSystemsScenePath), { ticks: 4, seed: 10 });
    assert.equal(runtimeNoSystems.ticksExecuted, 4);
    assert.equal(runtimeNoSystems.finalState, 10);
    assert.deepEqual(runtimeNoSystems.executedSystems, []);

    const cliNoSystems = runCli(['run-loop', noSystemsScenePath, '--ticks', '4', '--seed', '10', '--json']);
    assert.equal(cliNoSystems.status, 0, cliNoSystems.stderr);
    const cliNoSystemsReport = JSON.parse(cliNoSystems.stdout);
    assert.equal(cliNoSystemsReport.ticksExecuted, 4);
    assert.equal(cliNoSystemsReport.finalState, 10);
    assert.deepEqual(cliNoSystemsReport.executedSystems, []);

    const mcpNoSystems = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: relativeNoSystemsPath,
        ticks: 4,
        seed: 10
      }
    });
    assert.equal(mcpNoSystems.result.isError, false);
    assert.equal(mcpNoSystems.result.structuredContent.ticksExecuted, 4);
    assert.equal(mcpNoSystems.result.structuredContent.finalState, 10);
    assert.deepEqual(mcpNoSystems.result.structuredContent.executedSystems, []);

    const runtimeUnknownFirst = runMinimalSystemLoop(await loadSceneFile(unknownSystemScenePath), { ticks: 4, seed: 10 });
    const runtimeUnknownSecond = runMinimalSystemLoop(await loadSceneFile(unknownSystemScenePath), { ticks: 4, seed: 10 });
    assert.deepEqual(runtimeUnknownFirst, runtimeUnknownSecond);

    const cliUnknownFirst = runCli(['run-loop', unknownSystemScenePath, '--ticks', '4', '--seed', '10', '--json']);
    const cliUnknownSecond = runCli(['run-loop', unknownSystemScenePath, '--ticks', '4', '--seed', '10', '--json']);
    assert.equal(cliUnknownFirst.status, 0, cliUnknownFirst.stderr);
    assert.equal(cliUnknownSecond.status, 0, cliUnknownSecond.stderr);
    assert.deepEqual(JSON.parse(cliUnknownFirst.stdout), JSON.parse(cliUnknownSecond.stdout));

    const mcpUnknownFirst = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: relativeUnknownSystemPath,
        ticks: 4,
        seed: 10
      }
    });
    const mcpUnknownSecond = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: relativeUnknownSystemPath,
        ticks: 4,
        seed: 10
      }
    });
    assert.equal(mcpUnknownFirst.result.isError, false);
    assert.equal(mcpUnknownSecond.result.isError, false);
    assert.deepEqual(mcpUnknownFirst.result.structuredContent, mcpUnknownSecond.result.structuredContent);
  } finally {
    await mcp.close();
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('run-loop omitted seed uses default 1337 across runtime, CLI and MCP', async () => {
  const ticks = 4;
  const scene = await loadSceneFile(tutorialScenePath);
  const runtime = runMinimalSystemLoop(scene, { ticks });
  assert.equal(runtime.ticksExecuted, 4);
  assert.equal(runtime.finalState, 1361);

  const cli = runCli(['run-loop', tutorialScenePath, '--ticks', String(ticks), '--json']);
  assert.equal(cli.status, 0, cli.stderr);
  const cliReport = JSON.parse(cli.stdout);
  assert.equal(cliReport.seed, 1337);
  assert.equal(cliReport.ticksExecuted, 4);
  assert.equal(cliReport.finalState, 1361);

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
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks
      }
    });
    assert.equal(mcpResponse.result.isError, false);
    assert.equal(mcpResponse.result.structuredContent.seed, 1337);
    assert.equal(mcpResponse.result.structuredContent.ticksExecuted, 4);
    assert.equal(mcpResponse.result.structuredContent.finalState, 1361);
  } finally {
    await mcp.close();
  }
});
