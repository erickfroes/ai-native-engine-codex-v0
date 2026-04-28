import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  loadSceneFile,
  loadValidatedInputIntentV1,
  runMinimalSystemLoop,
  buildRenderSnapshotV1,
  renderBrowserPlayableDemoHtmlV1,
  createBrowserPlayableDemoMetadataV1,
  buildCollisionBoundsReportV1,
  buildCollisionOverlapReportV1,
  buildTileCollisionReportV1,
  buildMovementBlockingReportV1,
  BROWSER_PLAYABLE_DEMO_VERSION
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const mcpServerPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const scenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const sceneMcpPath = './scenes/v1-small-2d.scene.json';
const moveRightIntentPath = path.join(repoRoot, 'fixtures', 'input', 'v1-small-2d-move-right.intent.json');
const moveRightIntentMcpPath = './fixtures/input/v1-small-2d-move-right.intent.json';
const moveDownIntentPath = path.join(repoRoot, 'fixtures', 'input', 'v1-small-2d-move-down.intent.json');
const moveDownIntentMcpPath = './fixtures/input/v1-small-2d-move-down.intent.json';

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

function normalizeLoopReport(report) {
  return {
    loopReportVersion: report.loopReportVersion,
    scene: report.scene,
    ticks: report.ticks,
    seed: report.seed,
    ticksExecuted: report.ticksExecuted,
    finalState: report.finalState,
    executedSystems: report.executedSystems
  };
}

async function initializeMcp(mcp) {
  const initResponse = await mcp.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });
  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  mcp.notify('notifications/initialized');
}

test('v1 small 2d readiness render outputs stay aligned across runtime, CLI and MCP', async () => {
  const scene = await loadSceneFile(scenePath);
  const snapshot = await buildRenderSnapshotV1(scene);
  const runtimeBrowserDemo = {
    browserDemoVersion: BROWSER_PLAYABLE_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderBrowserPlayableDemoHtmlV1({
      title: `${snapshot.scene} Browser Playable Demo`,
      renderSnapshot: snapshot,
      metadata: createBrowserPlayableDemoMetadataV1(scene, snapshot)
    })
  };
  const runtimeBlockingBrowserDemo = {
    browserDemoVersion: BROWSER_PLAYABLE_DEMO_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    html: renderBrowserPlayableDemoHtmlV1({
      title: `${snapshot.scene} Browser Playable Demo`,
      renderSnapshot: snapshot,
      metadata: createBrowserPlayableDemoMetadataV1(scene, snapshot, { movementBlocking: true })
    })
  };

  const cliSnapshotResult = runCli(['render-snapshot', scenePath, '--json']);
  const cliBrowserResult = runCli(['render-browser-demo', scenePath, '--json']);
  const cliBlockingBrowserResult = runCli(['render-browser-demo', scenePath, '--movement-blocking', '--json']);

  assert.equal(cliSnapshotResult.status, 0, cliSnapshotResult.stderr);
  assert.equal(cliBrowserResult.status, 0, cliBrowserResult.stderr);
  assert.equal(cliBlockingBrowserResult.status, 0, cliBlockingBrowserResult.stderr);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);

    const mcpSnapshotResponse = await mcp.request('tools/call', {
      name: 'render_snapshot',
      arguments: { path: sceneMcpPath }
    });
    const mcpBrowserResponse = await mcp.request('tools/call', {
      name: 'render_browser_demo',
      arguments: { path: sceneMcpPath }
    });
    const mcpBlockingBrowserResponse = await mcp.request('tools/call', {
      name: 'render_browser_demo',
      arguments: { path: sceneMcpPath, movementBlocking: true }
    });

    assert.equal(mcpSnapshotResponse.result.isError, false);
    assert.equal(mcpBrowserResponse.result.isError, false);
    assert.equal(mcpBlockingBrowserResponse.result.isError, false);
    assert.deepEqual(snapshot, JSON.parse(cliSnapshotResult.stdout));
    assert.deepEqual(snapshot, mcpSnapshotResponse.result.structuredContent);
    assert.deepEqual(runtimeBrowserDemo, JSON.parse(cliBrowserResult.stdout));
    assert.deepEqual(runtimeBrowserDemo, mcpBrowserResponse.result.structuredContent);
    assert.deepEqual(runtimeBlockingBrowserDemo, JSON.parse(cliBlockingBrowserResult.stdout));
    assert.deepEqual(runtimeBlockingBrowserDemo, mcpBlockingBrowserResponse.result.structuredContent);
    assert.doesNotMatch(runtimeBrowserDemo.html, /"movementBlocking":/);
    assert.match(runtimeBlockingBrowserDemo.html, /"movementBlocking":/);
    assert.match(runtimeBlockingBrowserDemo.html, /"id":"map\.ground\.tile\.2\.3"/);
  } finally {
    await mcp.close();
  }
});

test('v1 small 2d readiness diagnostics stay aligned across runtime, CLI and MCP', async () => {
  const rightIntent = await loadValidatedInputIntentV1(moveRightIntentPath);
  const downIntent = await loadValidatedInputIntentV1(moveDownIntentPath);
  const runtimeBounds = await buildCollisionBoundsReportV1(scenePath);
  const runtimeOverlaps = await buildCollisionOverlapReportV1(scenePath);
  const runtimeTiles = await buildTileCollisionReportV1(scenePath);
  const runtimeBlockedMove = await buildMovementBlockingReportV1(scenePath, { inputIntent: rightIntent });
  const runtimeOpenMove = await buildMovementBlockingReportV1(scenePath, { inputIntent: downIntent });

  const cliBounds = runCli(['inspect-collision-bounds', scenePath, '--json']);
  const cliOverlaps = runCli(['inspect-collision-overlaps', scenePath, '--json']);
  const cliTiles = runCli(['inspect-tile-collision', scenePath, '--json']);
  const cliBlockedMove = runCli([
    'inspect-movement-blocking',
    scenePath,
    '--input-intent',
    moveRightIntentPath,
    '--json'
  ]);
  const cliOpenMove = runCli([
    'inspect-movement-blocking',
    scenePath,
    '--input-intent',
    moveDownIntentPath,
    '--json'
  ]);

  assert.equal(cliBounds.status, 0, cliBounds.stderr);
  assert.equal(cliOverlaps.status, 0, cliOverlaps.stderr);
  assert.equal(cliTiles.status, 0, cliTiles.stderr);
  assert.equal(cliBlockedMove.status, 0, cliBlockedMove.stderr);
  assert.equal(cliOpenMove.status, 0, cliOpenMove.stderr);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);

    const mcpBounds = await mcp.request('tools/call', {
      name: 'inspect_collision_bounds',
      arguments: { path: sceneMcpPath }
    });
    const mcpOverlaps = await mcp.request('tools/call', {
      name: 'inspect_collision_overlaps',
      arguments: { path: sceneMcpPath }
    });
    const mcpTiles = await mcp.request('tools/call', {
      name: 'inspect_tile_collision',
      arguments: { path: sceneMcpPath }
    });
    const mcpBlockedMove = await mcp.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: { path: sceneMcpPath, inputIntentPath: moveRightIntentMcpPath }
    });
    const mcpOpenMove = await mcp.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: { path: sceneMcpPath, inputIntentPath: moveDownIntentMcpPath }
    });

    assert.equal(mcpBounds.result.isError, false);
    assert.equal(mcpOverlaps.result.isError, false);
    assert.equal(mcpTiles.result.isError, false);
    assert.equal(mcpBlockedMove.result.isError, false);
    assert.equal(mcpOpenMove.result.isError, false);
    assert.deepEqual(runtimeBounds, JSON.parse(cliBounds.stdout));
    assert.deepEqual(runtimeBounds, mcpBounds.result.structuredContent);
    assert.deepEqual(runtimeOverlaps, JSON.parse(cliOverlaps.stdout));
    assert.deepEqual(runtimeOverlaps, mcpOverlaps.result.structuredContent);
    assert.deepEqual(runtimeTiles, JSON.parse(cliTiles.stdout));
    assert.deepEqual(runtimeTiles, mcpTiles.result.structuredContent);
    assert.deepEqual(runtimeBlockedMove, JSON.parse(cliBlockedMove.stdout));
    assert.deepEqual(runtimeBlockedMove, mcpBlockedMove.result.structuredContent);
    assert.deepEqual(runtimeOpenMove, JSON.parse(cliOpenMove.stdout));
    assert.deepEqual(runtimeOpenMove, mcpOpenMove.result.structuredContent);
    assert.equal(runtimeBlockedMove.blocked, true);
    assert.deepEqual(runtimeBlockedMove.blockingEntities, ['map.ground.tile.2.3']);
    assert.equal(runtimeOpenMove.blocked, false);
  } finally {
    await mcp.close();
  }
});

test('v1 small 2d readiness run-loop movementBlocking remains opt-in across runtime, CLI and MCP', async () => {
  const scene = await loadSceneFile(scenePath);
  const rightIntent = await loadValidatedInputIntentV1(moveRightIntentPath);
  const downIntent = await loadValidatedInputIntentV1(moveDownIntentPath);
  const runtimeBaseline = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks: 1,
    seed: 1337,
    ...runMinimalSystemLoop(scene, { ticks: 1, inputIntent: rightIntent })
  });
  const runtimeBlocked = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks: 1,
    seed: 1337,
    ...runMinimalSystemLoop(scene, { ticks: 1, inputIntent: rightIntent, movementBlocking: true })
  });
  const runtimeOpen = normalizeLoopReport({
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks: 1,
    seed: 1337,
    ...runMinimalSystemLoop(scene, { ticks: 1, inputIntent: downIntent, movementBlocking: true })
  });

  const cliBaseline = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '1',
    '--input-intent',
    moveRightIntentPath,
    '--json'
  ]);
  const cliBlocked = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '1',
    '--movement-blocking',
    '--input-intent',
    moveRightIntentPath,
    '--json'
  ]);
  const cliOpen = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '1',
    '--movement-blocking',
    '--input-intent',
    moveDownIntentPath,
    '--json'
  ]);

  assert.equal(cliBaseline.status, 0, cliBaseline.stderr);
  assert.equal(cliBlocked.status, 0, cliBlocked.stderr);
  assert.equal(cliOpen.status, 0, cliOpen.stderr);

  const mcp = createMcpClient();
  try {
    await initializeMcp(mcp);

    const mcpBaseline = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: sceneMcpPath,
        ticks: 1,
        inputIntentPath: moveRightIntentMcpPath
      }
    });
    const mcpBlocked = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: sceneMcpPath,
        ticks: 1,
        movementBlocking: true,
        inputIntentPath: moveRightIntentMcpPath
      }
    });
    const mcpOpen = await mcp.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: sceneMcpPath,
        ticks: 1,
        movementBlocking: true,
        inputIntentPath: moveDownIntentMcpPath
      }
    });

    assert.equal(mcpBaseline.result.isError, false);
    assert.equal(mcpBlocked.result.isError, false);
    assert.equal(mcpOpen.result.isError, false);
    assert.deepEqual(runtimeBaseline, normalizeLoopReport(JSON.parse(cliBaseline.stdout)));
    assert.deepEqual(runtimeBaseline, normalizeLoopReport(mcpBaseline.result.structuredContent));
    assert.deepEqual(runtimeBlocked, normalizeLoopReport(JSON.parse(cliBlocked.stdout)));
    assert.deepEqual(runtimeBlocked, normalizeLoopReport(mcpBlocked.result.structuredContent));
    assert.deepEqual(runtimeOpen, normalizeLoopReport(JSON.parse(cliOpen.stdout)));
    assert.deepEqual(runtimeOpen, normalizeLoopReport(mcpOpen.result.structuredContent));
    assert.equal(runtimeBaseline.finalState, 1339);
    assert.equal(runtimeBlocked.finalState, 1338);
    assert.equal(runtimeOpen.finalState, 1339);
  } finally {
    await mcp.close();
  }
});
