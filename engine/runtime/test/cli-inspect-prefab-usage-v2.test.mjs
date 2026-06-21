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
const missingPrefabScenePath = path.join(fixtureDir, 'invalid_prefab_missing.scene.json');
const validPrefabAbsolutePath = path.join(fixtureDir, 'prefabs', 'player-actor.prefab.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-prefab-usage-v2 returns deterministic PrefabUsageReport v2 JSON', () => {
  const first = runCli(['inspect-prefab-usage-v2', prefabScenePath, '--json']);
  const second = runCli(['inspect-prefab-usage-v2', prefabScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);

  assert.deepEqual(JSON.parse(first.stdout), {
    prefabUsageReportVersion: 2,
    absolutePath: prefabScenePath,
    scene: 'prefab-usage-fixture',
    prefabs: [
      {
        entityId: 'player.hero',
        entityPath: '$.entities[0]',
        prefab: './prefabs/player-actor.prefab.json',
        prefabAbsolutePath: validPrefabAbsolutePath,
        prefabName: 'player.actor',
        prefabVersion: 1,
        components: [
          {
            kind: 'transform',
            source: 'entity',
            sourceComponentPath: '$.entities[0].components[0]',
            resolvedComponentPath: '$.entities[0].components[0]'
          },
          {
            kind: 'visual.sprite',
            source: 'prefab',
            sourceComponentPath: '$.components[1]',
            resolvedComponentPath: '$.entities[0].components[1]'
          },
          {
            kind: 'collision.bounds',
            source: 'prefab',
            sourceComponentPath: '$.components[2]',
            resolvedComponentPath: '$.entities[0].components[2]'
          }
        ],
        overriddenComponents: ['transform'],
        overrides: [
          {
            kind: 'transform',
            entityComponentPath: '$.entities[0].components[0]',
            prefabComponentPath: '$.components[0]',
            resolvedComponentPath: '$.entities[0].components[0]'
          }
        ]
      }
    ]
  });
});

test('inspect-prefab-usage-v2 prints stable readable trace output without --json', () => {
  const result = runCli(['inspect-prefab-usage-v2', prefabScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: prefab-usage-fixture/);
  assert.match(result.stdout, /Path: .*prefab-usage\.scene\.json/);
  assert.match(result.stdout, /Prefab usage report version: 2/);
  assert.match(result.stdout, /entityPath: \$\.entities\[0\]/);
  assert.match(result.stdout, new RegExp(validPrefabAbsolutePath.replaceAll('\\', '\\\\')));
  assert.match(
    result.stdout,
    /transform\(entity \$\.entities\[0\]\.components\[0\] -> \$\.entities\[0\]\.components\[0\]\)/
  );
  assert.match(
    result.stdout,
    /transform\(\$\.entities\[0\]\.components\[0\] -> \$\.components\[0\] -> \$\.entities\[0\]\.components\[0\]\)/
  );
});

test('inspect-prefab-usage-v2 fails predictably for invalid prefab scenes', () => {
  const result = runCli(['inspect-prefab-usage-v2', missingPrefabScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_prefab_missing\.scene\.json/);
});
