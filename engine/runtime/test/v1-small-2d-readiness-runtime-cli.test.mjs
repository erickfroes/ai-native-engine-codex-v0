import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  loadSceneFile,
  buildRenderSnapshotV1,
  buildCollisionBoundsReportV1,
  buildCollisionOverlapReportV1,
  buildTileCollisionReportV1,
  buildMovementBlockingReportV1
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const scenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const moveRightIntentPath = path.join(repoRoot, 'fixtures', 'input', 'v1-small-2d-move-right.intent.json');
const moveDownIntentPath = path.join(repoRoot, 'fixtures', 'input', 'v1-small-2d-move-down.intent.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function assertNoForbiddenBrowserSurface(html) {
  assert.doesNotMatch(
    html,
    /<script[^>]+src=|<link[^>]+href=|fetch\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage/
  );
}

test('v1 small 2d readiness scene renders a deterministic camera-shifted snapshot via runtime and CLI', async () => {
  const scene = await loadSceneFile(scenePath);
  const runtimeSnapshot = await buildRenderSnapshotV1(scene);
  const cliResult = runCli(['render-snapshot', scenePath, '--json']);

  assert.equal(cliResult.status, 0, cliResult.stderr);
  const cliSnapshot = JSON.parse(cliResult.stdout);

  assert.deepEqual(runtimeSnapshot, cliSnapshot);
  assert.deepEqual(runtimeSnapshot.viewport, { width: 32, height: 24 });
  assert.equal(runtimeSnapshot.scene, 'v1-small-2d');
  assert.equal(runtimeSnapshot.drawCalls.length, 23);
  assert.deepEqual(runtimeSnapshot.drawCalls[0], {
    kind: 'rect',
    id: 'map.ground.tile.0.0',
    x: -4,
    y: 0,
    width: 4,
    height: 4,
    layer: -10
  });
  assert.deepEqual(
    runtimeSnapshot.drawCalls.find((drawCall) => drawCall.id === 'map.ground.tile.2.3'),
    {
      kind: 'rect',
      id: 'map.ground.tile.2.3',
      x: 8,
      y: 8,
      width: 4,
      height: 4,
      layer: -10
    }
  );
  assert.deepEqual(
    runtimeSnapshot.drawCalls.find((drawCall) => drawCall.id === 'player.hero'),
    {
      kind: 'rect',
      id: 'player.hero',
      x: 0,
      y: 8,
      width: 8,
      height: 8,
      layer: 5
    }
  );
});

test('v1 small 2d Browser Demo keeps default movement free and embeds blocking only with the opt-in flag', () => {
  const defaultResult = runCli(['render-browser-demo', scenePath, '--json']);
  const blockingResult = runCli(['render-browser-demo', scenePath, '--movement-blocking', '--json']);

  assert.equal(defaultResult.status, 0, defaultResult.stderr);
  assert.equal(blockingResult.status, 0, blockingResult.stderr);

  const defaultEnvelope = JSON.parse(defaultResult.stdout);
  const blockingEnvelope = JSON.parse(blockingResult.stdout);

  assert.deepEqual(Object.keys(defaultEnvelope).sort(), ['browserDemoVersion', 'html', 'scene', 'tick']);
  assert.deepEqual(Object.keys(blockingEnvelope).sort(), ['browserDemoVersion', 'html', 'scene', 'tick']);
  assert.equal(defaultEnvelope.scene, 'v1-small-2d');
  assert.equal(blockingEnvelope.scene, 'v1-small-2d');
  assert.equal(defaultEnvelope.browserDemoVersion, 1);
  assert.equal(blockingEnvelope.browserDemoVersion, 1);
  assert.match(defaultEnvelope.html, /data-controllable-entity="player\.hero"/);
  assert.match(defaultEnvelope.html, /"id":"map\.ground\.tile\.2\.3"/);
  assert.doesNotMatch(defaultEnvelope.html, /"movementBlocking":/);
  assert.match(blockingEnvelope.html, /"movementBlocking":/);
  assert.match(blockingEnvelope.html, /"id":"map\.ground\.tile\.2\.3"/);
  assert.match(blockingEnvelope.html, /"id":"wall\.block"/);
  assertNoForbiddenBrowserSurface(defaultEnvelope.html);
  assertNoForbiddenBrowserSurface(blockingEnvelope.html);
});

test('v1 small 2d readiness diagnostics stay deterministic through runtime and CLI', async () => {
  const moveRightIntent = loadJson(moveRightIntentPath);
  const moveDownIntent = loadJson(moveDownIntentPath);
  const runtimeBounds = await buildCollisionBoundsReportV1(scenePath);
  const runtimeOverlaps = await buildCollisionOverlapReportV1(scenePath);
  const runtimeTiles = await buildTileCollisionReportV1(scenePath);
  const runtimeBlockedMove = await buildMovementBlockingReportV1(scenePath, { inputIntent: moveRightIntent });
  const runtimeOpenMove = await buildMovementBlockingReportV1(scenePath, { inputIntent: moveDownIntent });

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
  assert.deepEqual(runtimeBounds, JSON.parse(cliBounds.stdout));
  assert.deepEqual(runtimeOverlaps, JSON.parse(cliOverlaps.stdout));
  assert.deepEqual(runtimeTiles, JSON.parse(cliTiles.stdout));
  assert.deepEqual(runtimeBlockedMove, JSON.parse(cliBlockedMove.stdout));
  assert.deepEqual(runtimeOpenMove, JSON.parse(cliOpenMove.stdout));
  assert.deepEqual(runtimeBounds, {
    collisionBoundsReportVersion: 1,
    scene: 'v1-small-2d',
    bounds: [
      { entityId: 'ghost.trigger', x: 6, y: 10, width: 4, height: 4, solid: false },
      { entityId: 'player.hero', x: 4, y: 8, width: 8, height: 8, solid: true },
      { entityId: 'wall.block', x: 24, y: 8, width: 8, height: 8, solid: true }
    ]
  });
  assert.deepEqual(runtimeOverlaps, {
    collisionOverlapReportVersion: 1,
    scene: 'v1-small-2d',
    overlaps: [
      { entityAId: 'ghost.trigger', entityBId: 'player.hero', solid: false }
    ]
  });
  assert.deepEqual(runtimeTiles, {
    tileCollisionReportVersion: 1,
    scene: 'v1-small-2d',
    tiles: [
      {
        tileId: 'map.ground.tile.2.3',
        layerEntityId: 'map.ground',
        row: 2,
        column: 3,
        paletteId: '2',
        x: 12,
        y: 8,
        width: 4,
        height: 4,
        solid: true
      }
    ]
  });
  assert.deepEqual(runtimeBlockedMove, {
    movementBlockingReportVersion: 1,
    scene: 'v1-small-2d',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 4, y: 8 },
    candidate: { x: 5, y: 8 },
    final: { x: 4, y: 8 },
    blocked: true,
    blockingEntities: ['map.ground.tile.2.3']
  });
  assert.deepEqual(runtimeOpenMove, {
    movementBlockingReportVersion: 1,
    scene: 'v1-small-2d',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 0, y: 1 },
    from: { x: 4, y: 8 },
    candidate: { x: 4, y: 9 },
    final: { x: 4, y: 9 },
    blocked: false,
    blockingEntities: []
  });
});

test('v1 small 2d run-loop keeps movementBlocking opt-in via CLI', () => {
  const baseline = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '1',
    '--input-intent',
    moveRightIntentPath,
    '--json'
  ]);
  const blocked = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '1',
    '--movement-blocking',
    '--input-intent',
    moveRightIntentPath,
    '--json'
  ]);
  const open = runCli([
    'run-loop',
    scenePath,
    '--ticks',
    '1',
    '--movement-blocking',
    '--input-intent',
    moveDownIntentPath,
    '--json'
  ]);

  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(blocked.status, 0, blocked.stderr);
  assert.equal(open.status, 0, open.stderr);
  assert.equal(JSON.parse(baseline.stdout).finalState, 1339);
  assert.equal(JSON.parse(blocked.stdout).finalState, 1338);
  assert.equal(JSON.parse(open.stdout).finalState, 1339);
});
