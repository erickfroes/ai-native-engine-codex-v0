import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures');
const prefabScenePath = path.join(fixtureDir, 'prefab-usage.scene.json');
const prefabOnlyScenePath = path.join(fixtureDir, 'prefab-usage-prefab-only.scene.json');
const missingPrefabScenePath = path.join(fixtureDir, 'invalid_prefab_missing.scene.json');
const unsafePrefabPathsScenePath = path.join(fixtureDir, 'invalid_prefab_unsafe_paths.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-prefab-usage returns deterministic PrefabUsageReport v1 JSON', () => {
  const first = runCli(['inspect-prefab-usage', prefabScenePath, '--json']);
  const second = runCli(['inspect-prefab-usage', prefabScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);

  assert.deepEqual(JSON.parse(first.stdout), {
    prefabUsageReportVersion: 1,
    scene: 'prefab-usage-fixture',
    prefabs: [
      {
        entityId: 'player.hero',
        prefab: './prefabs/player-actor.prefab.json',
        prefabName: 'player.actor',
        prefabVersion: 1,
        components: [
          {
            kind: 'transform',
            source: 'entity'
          },
          {
            kind: 'visual.sprite',
            source: 'prefab'
          },
          {
            kind: 'collision.bounds',
            source: 'prefab'
          }
        ],
        overriddenComponents: ['transform']
      }
    ]
  });
});

test('inspect-prefab-usage returns empty reports for scenes without prefab references', () => {
  const result = runCli(['inspect-prefab-usage', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    prefabUsageReportVersion: 1,
    scene: 'tutorial',
    prefabs: []
  });
});

test('inspect-prefab-usage supports prefab-backed entities without explicit components', () => {
  const result = runCli(['inspect-prefab-usage', prefabOnlyScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    prefabUsageReportVersion: 1,
    scene: 'prefab-usage-prefab-only-fixture',
    prefabs: [
      {
        entityId: 'player.hero',
        prefab: './prefabs/player-actor.prefab.json',
        prefabName: 'player.actor',
        prefabVersion: 1,
        components: [
          {
            kind: 'transform',
            source: 'prefab'
          },
          {
            kind: 'visual.sprite',
            source: 'prefab'
          },
          {
            kind: 'collision.bounds',
            source: 'prefab'
          }
        ],
        overriddenComponents: []
      }
    ]
  });
});

test('inspect-prefab-usage prints stable readable output without --json', () => {
  const result = runCli(['inspect-prefab-usage', prefabScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Prefab usage report version: 1/);
  assert.match(result.stdout, /Scene: prefab-usage-fixture/);
  assert.match(result.stdout, /Prefab entities: 1/);
  assert.match(result.stdout, /player\.hero: \.\/prefabs\/player-actor\.prefab\.json \(player\.actor\)/);
  assert.match(result.stdout, /transform\(entity\), visual\.sprite\(prefab\), collision\.bounds\(prefab\)/);
});

test('inspect-prefab-usage fails predictably for invalid prefab scenes', () => {
  const result = runCli(['inspect-prefab-usage', missingPrefabScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_prefab_missing\.scene\.json/);
});

test('inspect-prefab-usage fails predictably for unsafe prefab path references', () => {
  const result = runCli(['inspect-prefab-usage', unsafePrefabPathsScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_prefab_unsafe_paths\.scene\.json/);
});
