import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const solidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'tile-collision-solid.scene.json');
const emptyScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'tile-collision-empty.scene.json');
const invalidScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_tile_collision_solid.scene.json'
);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-tile-collision returns deterministic TileCollisionReport v1 JSON', () => {
  const first = runCli(['inspect-tile-collision', solidScenePath, '--json']);
  const second = runCli(['inspect-tile-collision', solidScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.deepEqual(JSON.parse(first.stdout), {
    tileCollisionReportVersion: 1,
    scene: 'tile-collision-solid-fixture',
    tiles: [
      {
        tileId: 'map.walls.tile.0.0',
        layerEntityId: 'map.walls',
        row: 0,
        column: 0,
        paletteId: '1',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        solid: true
      },
      {
        tileId: 'map.walls.tile.0.2',
        layerEntityId: 'map.walls',
        row: 0,
        column: 2,
        paletteId: 'wall',
        x: 32,
        y: 0,
        width: 24,
        height: 24,
        solid: true
      },
      {
        tileId: 'map.walls.tile.1.1',
        layerEntityId: 'map.walls',
        row: 1,
        column: 1,
        paletteId: '1',
        x: 16,
        y: 16,
        width: 16,
        height: 16,
        solid: true
      }
    ]
  });
});

test('inspect-tile-collision prints readable output without --json', () => {
  const result = runCli(['inspect-tile-collision', solidScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: tile-collision-solid-fixture/);
  assert.match(result.stdout, /Tile collision report version: 1/);
  assert.match(result.stdout, /Tiles: 3/);
  assert.match(result.stdout, /map\.walls\.tile\.0\.0: 0,0 16x16 palette=1 solid=true/);
});

test('inspect-tile-collision returns empty tiles for scenes without solid tiles', () => {
  const result = runCli(['inspect-tile-collision', emptyScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    tileCollisionReportVersion: 1,
    scene: 'tile-collision-empty-fixture',
    tiles: []
  });
});

test('inspect-tile-collision fails predictably for invalid scenes', () => {
  const result = runCli(['inspect-tile-collision', invalidScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_tile_collision_solid\.scene\.json/);
});
