import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixturePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'pathfinding-grid-basic.scene.json');
const invalidScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_tile_layer_unknown_palette.scene.json'
);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-pathfinding-grid returns deterministic PathfindingGridReport v1 JSON', () => {
  const first = runCli(['inspect-pathfinding-grid', fixturePath, '--json']);
  const second = runCli(['inspect-pathfinding-grid', fixturePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const report = JSON.parse(first.stdout);
  assert.equal(report.pathfindingGridReportVersion, 1);
  assert.equal(report.scene, 'pathfinding-grid-basic-fixture');
  assert.equal(report.grids.length, 1);
  assert.deepEqual(report.grids[0].blockedCells.map((cell) => cell.cellId), [
    'map.nav.cell.0.1',
    'map.nav.cell.1.0'
  ]);
});

test('inspect-pathfinding-grid prints readable output without --json', () => {
  const result = runCli(['inspect-pathfinding-grid', fixturePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: pathfinding-grid-basic-fixture/);
  assert.match(result.stdout, /Pathfinding grid report version: 1/);
  assert.match(result.stdout, /Grids: 1/);
  assert.match(result.stdout, /Blockers: 2/);
  assert.match(result.stdout, /map\.nav: 3x2 cells=6 blocked=2 walkable=4/);
});

test('inspect-pathfinding-grid fails predictably for invalid scenes', () => {
  const result = runCli(['inspect-pathfinding-grid', invalidScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_tile_layer_unknown_palette\.scene\.json/);
});

test('inspect-pathfinding-grid rejects unexpected positional arguments', () => {
  const result = runCli(['inspect-pathfinding-grid', fixturePath, 'unexpected-extra', '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /inspect-pathfinding-grid: unexpected argument `unexpected-extra`/);
});
