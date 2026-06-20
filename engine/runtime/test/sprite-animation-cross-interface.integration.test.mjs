import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildSpriteAnimationReportV1 } from '../src/index.mjs';

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

async function assertSpriteAnimationInterfacesAligned(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const runtimeReport = await buildSpriteAnimationReportV1(absolutePath);
  const cliResult = runCli(['inspect-sprite-animation', absolutePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliReport = JSON.parse(cliResult.stdout);
  const mcpResponse = await callMcpTool('inspect_sprite_animation', {
    path: `./${relativePath.replaceAll('\\', '/')}`
  });

  assert.equal(mcpResponse.result.isError, false);
  assert.deepEqual(runtimeReport, cliReport);
  assert.deepEqual(runtimeReport, mcpResponse.result.structuredContent);
  return runtimeReport;
}

test('SpriteAnimationReport v1 stays aligned across runtime, CLI and MCP for scenes without animations', async () => {
  const report = await assertSpriteAnimationInterfacesAligned('scenes/tutorial.scene.json');

  assert.deepEqual(report, {
    spriteAnimationReportVersion: 1,
    scene: 'tutorial',
    animations: [],
    warnings: [],
    invalidRefs: []
  });
});

test('SpriteAnimationReport v1 stays aligned across runtime, CLI and MCP for idle animation frames', async () => {
  const report = await assertSpriteAnimationInterfacesAligned(
    'engine/runtime/test/fixtures/sprite-animation-idle.scene.json'
  );

  assert.equal(report.animations[0].animationId, 'player.idle');
  assert.equal(report.animations[0].state, 'idle');
  assert.deepEqual(report.animations[0].frames.map((frame) => frame.index), [0, 1]);
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.invalidRefs, []);
});

test('SpriteAnimationReport v1 stays aligned across runtime, CLI and MCP for invalid visual sprite refs', async () => {
  const report = await assertSpriteAnimationInterfacesAligned(
    'engine/runtime/test/fixtures/sprite-animation-missing-visual-sprite.scene.json'
  );

  assert.equal(report.warnings[0].code, 'SPRITE_ANIMATION_ASSET_NOT_IN_VISUAL_SPRITE');
  assert.deepEqual(report.invalidRefs, [
    {
      entityId: 'player.hero',
      animationId: 'player.idle',
      assetId: 'player.missing',
      reason: 'SPRITE_ANIMATION_ASSET_NOT_IN_VISUAL_SPRITE'
    }
  ]);
});

test('SpriteAnimationReport v1 invalid scenes fail predictably across runtime, CLI and MCP', async () => {
  const relativePath = 'engine/runtime/test/fixtures/invalid_sprite_animation_frame.scene.json';
  const absolutePath = path.join(repoRoot, relativePath);

  await assert.rejects(
    () => buildSpriteAnimationReportV1(absolutePath),
    /Scene validation failed/
  );

  const cliResult = runCli(['inspect-sprite-animation', absolutePath, '--json']);
  assert.notEqual(cliResult.status, 0);
  assert.match(cliResult.stderr, /Scene validation failed/);

  const mcpResponse = await callMcpTool('inspect_sprite_animation', {
    path: `./${relativePath}`
  });
  assert.equal(mcpResponse.result.isError, true);
  assert.match(mcpResponse.result.content[0].text, /Scene validation failed/);
});
