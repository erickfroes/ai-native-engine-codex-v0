import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const blockedScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-blocked.scene.json'
);
const openScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-open.scene.json'
);
const tileBlockedScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-tile-blocked.scene.json'
);
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_collision_bounds.scene.json');
const inputIntentPath = path.join(repoRoot, 'fixtures', 'input', 'move-player-right.intent.json');
const invalidInputIntentPath = path.join(repoRoot, 'fixtures', 'input', 'invalid.missing-entity.intent.json');
const missingInputIntentPath = path.join(repoRoot, 'fixtures', 'input', 'missing-movement.intent.json');
const missingScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'missing-movement.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-movement-blocking returns deterministic MovementBlockingReport v1 JSON for blocked movement', () => {
  const first = runCli(['inspect-movement-blocking', blockedScenePath, '--input-intent', inputIntentPath, '--json']);
  const second = runCli(['inspect-movement-blocking', blockedScenePath, '--input-intent', inputIntentPath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.deepEqual(JSON.parse(first.stdout), {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-blocked-fixture',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 1, y: 0 },
    final: { x: 0, y: 0 },
    blocked: true,
    blockingEntities: ['wall.block']
  });
});

test('inspect-movement-blocking reports tile.layer blockers with stable layer entity ids', () => {
  const result = runCli(['inspect-movement-blocking', tileBlockedScenePath, '--input-intent', inputIntentPath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-tile-blocked-fixture',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 1, y: 0 },
    final: { x: 0, y: 0 },
    blocked: true,
    blockingEntities: ['map.walls.tile.0.1']
  });
});

test('inspect-movement-blocking returns JSON for unblocked movement', () => {
  const result = runCli(['inspect-movement-blocking', openScenePath, '--input-intent', inputIntentPath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-open-fixture',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 1, y: 0 },
    final: { x: 1, y: 0 },
    blocked: false,
    blockingEntities: []
  });
});

test('inspect-movement-blocking prints readable output without --json', () => {
  const result = runCli(['inspect-movement-blocking', blockedScenePath, '--input-intent', inputIntentPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: movement-blocking-blocked-fixture/);
  assert.match(result.stdout, /Movement blocking report version: 1/);
  assert.match(result.stdout, /Entity: player\.hero/);
  assert.match(result.stdout, /Attempted move: 1,0/);
  assert.match(result.stdout, /Candidate: 1,0/);
  assert.match(result.stdout, /Final: 0,0/);
  assert.match(result.stdout, /Blocked: true/);
  assert.match(result.stdout, /Blocking entities: wall\.block/);
});

test('inspect-movement-blocking fails predictably without --input-intent', () => {
  const result = runCli(['inspect-movement-blocking', blockedScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /inspect-movement-blocking: --input-intent is required/);
});

test('inspect-movement-blocking fails predictably for an invalid input intent', () => {
  const result = runCli(['inspect-movement-blocking', blockedScenePath, '--input-intent', invalidInputIntentPath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /input intent is invalid/);
  assert.match(result.stderr, /\$\.entityId: is required/);
});

test('inspect-movement-blocking fails predictably for a missing input intent path', () => {
  const result = runCli(['inspect-movement-blocking', blockedScenePath, '--input-intent', missingInputIntentPath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /missing-movement\.intent\.json/);
});

test('inspect-movement-blocking fails predictably for an invalid scene', () => {
  const result = runCli(['inspect-movement-blocking', invalidScenePath, '--input-intent', inputIntentPath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for/);
  assert.match(result.stderr, /invalid_collision_bounds\.scene\.json/);
});

test('inspect-movement-blocking fails predictably for a missing scene path', () => {
  const result = runCli(['inspect-movement-blocking', missingScenePath, '--input-intent', inputIntentPath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /missing-movement\.scene\.json/);
});

