import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const collisionBoundsScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-bounds.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const invalidCollisionBoundsScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_collision_bounds.scene.json'
);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-collision-bounds returns deterministic CollisionBoundsReport v1 JSON', () => {
  const first = runCli(['inspect-collision-bounds', collisionBoundsScenePath, '--json']);
  const second = runCli(['inspect-collision-bounds', collisionBoundsScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.deepEqual(JSON.parse(first.stdout), {
    collisionBoundsReportVersion: 1,
    scene: 'collision-bounds-fixture',
    bounds: [
      {
        entityId: 'player.hero',
        x: 12,
        y: 15,
        width: 12,
        height: 14,
        solid: true
      },
      {
        entityId: 'wall.block',
        x: 40,
        y: 8,
        width: 16,
        height: 32,
        solid: true
      }
    ]
  });
});

test('inspect-collision-bounds returns empty bounds for scenes without collision.bounds', () => {
  const result = runCli(['inspect-collision-bounds', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    collisionBoundsReportVersion: 1,
    scene: 'tutorial',
    bounds: []
  });
});

test('inspect-collision-bounds fails predictably for invalid collision bounds scenes', () => {
  const result = runCli(['inspect-collision-bounds', invalidCollisionBoundsScenePath, '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SceneValidationError: Scene validation failed for/);
  assert.match(result.stderr, /invalid_collision_bounds\.scene\.json/);
});
