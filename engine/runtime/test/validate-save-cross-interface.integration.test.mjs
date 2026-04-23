import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const validSavePath = path.join(repoRoot, 'fixtures', 'savegame', 'valid.savegame.json');
const legacySavePath = path.join(repoRoot, 'fixtures', 'savegame', 'legacy.v0.savegame.json');
const unsupportedVersionSavePath = path.join(
  repoRoot,
  'fixtures',
  'savegame',
  'invalid.unsupported-version.savegame.json'
);

const expectedReportKeys = ['errors', 'ok', 'path', 'reportVersion', 'save', 'warnings'];
const expectedSaveKeys = ['checksum', 'contentVersion', 'payloadRef', 'saveVersion', 'seed'];
const expectedErrorKeys = ['message', 'path'];

function normalizeSaveValidationReport(report) {
  return {
    reportVersion: report.reportVersion,
    ok: report.ok,
    path: report.path,
    save: report.save,
    errors: report.errors,
    warnings: report.warnings
  };
}

function assertReportShape(report) {
  assert.deepEqual(Object.keys(report).sort(), expectedReportKeys);
  assert.deepEqual(Object.keys(report.save).sort(), expectedSaveKeys);
  assert.equal(report.reportVersion, 1);
  assert.ok(Array.isArray(report.errors));
  assert.ok(Array.isArray(report.warnings));
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

async function assertCliMcpParity({ cliPathArg, mcpPathArg, expectedIsError }) {
  const cliResult = runCli(['validate-save', cliPathArg, '--json']);
  assert.equal(cliResult.status, expectedIsError ? 1 : 0, cliResult.stderr);
  const cliReport = normalizeSaveValidationReport(JSON.parse(cliResult.stdout));
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
      name: 'validate_save',
      arguments: {
        path: mcpPathArg
      }
    });

    assert.equal(mcpResponse.result.isError, expectedIsError);
    const mcpReport = normalizeSaveValidationReport(mcpResponse.result.structuredContent);
    assertReportShape(mcpReport);

    assert.deepEqual(cliReport, mcpReport);
    return { cliReport, mcpReport };
  } finally {
    await mcp.close();
  }
}

test('validate_save v1 report stays strictly aligned across CLI and MCP', async () => {
  const { cliReport, mcpReport } = await assertCliMcpParity({
    cliPathArg: validSavePath,
    mcpPathArg: './fixtures/savegame/valid.savegame.json',
    expectedIsError: false
  });

  assert.equal(cliReport.ok, true);
  assert.equal(mcpReport.ok, true);
  assert.equal(cliReport.reportVersion, 1);
});

test('validate_save legacy v0 report stays strictly aligned across CLI and MCP', async () => {
  const { cliReport, mcpReport } = await assertCliMcpParity({
    cliPathArg: legacySavePath,
    mcpPathArg: './fixtures/savegame/legacy.v0.savegame.json',
    expectedIsError: false
  });

  assert.equal(cliReport.ok, true);
  assert.equal(mcpReport.ok, true);
  assert.equal(cliReport.reportVersion, 1);
  assert.equal(cliReport.save.saveVersion, 1);
  assert.equal(cliReport.save.contentVersion, 1);
  assert.equal(cliReport.save.seed, 42);
  assert.equal(cliReport.save.checksum, 'sha256:dummy-checksum-v0');
  assert.equal(cliReport.save.payloadRef, 'saves/tutorial/slot-legacy-v0.payload.json');
});

test('validate_save unsupported version report stays strictly aligned across CLI and MCP', async () => {
  const { cliReport, mcpReport } = await assertCliMcpParity({
    cliPathArg: unsupportedVersionSavePath,
    mcpPathArg: './fixtures/savegame/invalid.unsupported-version.savegame.json',
    expectedIsError: true
  });

  assert.equal(cliReport.ok, false);
  assert.equal(mcpReport.ok, false);
  assert.equal(cliReport.reportVersion, 1);
  assert.ok(
    cliReport.errors.some(
      (error) => error.path === '$.saveVersion' && error.message === 'unsupported saveVersion: 2; supported: 1'
    )
  );
});
