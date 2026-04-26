import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const overlapScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-overlap.scene.json');
const noOverlapScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'collision-no-overlap.scene.json'
);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-collision-overlaps returns deterministic CollisionOverlapReport v1 JSON', () => {
  const first = runCli(['inspect-collision-overlaps', overlapScenePath, '--json']);
  const second = runCli(['inspect-collision-overlaps', overlapScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.deepEqual(JSON.parse(first.stdout), {
    collisionOverlapReportVersion: 1,
    scene: 'collision-overlap-fixture',
    overlaps: [
      {
        entityAId: 'ghost.zone',
        entityBId: 'player.hero',
        solid: false
      },
      {
        entityAId: 'player.hero',
        entityBId: 'wall.block',
        solid: true
      }
    ]
  });
});

test('inspect-collision-overlaps prints readable output without --json', () => {
  const result = runCli(['inspect-collision-overlaps', overlapScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: collision-overlap-fixture/);
  assert.match(result.stdout, /Collision overlap report version: 1/);
  assert.match(result.stdout, /Overlaps: 2/);
  assert.match(result.stdout, /ghost\.zone <-> player\.hero solid=false/);
  assert.match(result.stdout, /player\.hero <-> wall\.block solid=true/);
});

test('inspect-collision-overlaps returns empty overlaps for scenes without overlaps', () => {
  const result = runCli(['inspect-collision-overlaps', noOverlapScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    collisionOverlapReportVersion: 1,
    scene: 'collision-no-overlap-fixture',
    overlaps: []
  });
});
