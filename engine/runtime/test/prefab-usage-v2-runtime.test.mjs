import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPrefabUsageReportV2 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(testDir, 'fixtures');
const prefabScenePath = path.join(fixtureDir, 'prefab-usage.scene.json');
const prefabOnlyScenePath = path.join(fixtureDir, 'prefab-usage-prefab-only.scene.json');
const missingPrefabScenePath = path.join(fixtureDir, 'invalid_prefab_missing.scene.json');
const validPrefabAbsolutePath = path.join(fixtureDir, 'prefabs', 'player-actor.prefab.json');

test('buildPrefabUsageReportV2 returns deterministic traceable prefab usage for entity overrides', async () => {
  const first = await buildPrefabUsageReportV2(prefabScenePath);
  const second = await buildPrefabUsageReportV2(prefabScenePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
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

test('buildPrefabUsageReportV2 keeps source paths deterministic when prefab-backed entities omit explicit components', async () => {
  const report = await buildPrefabUsageReportV2(prefabOnlyScenePath);

  assert.deepEqual(report, {
    prefabUsageReportVersion: 2,
    absolutePath: prefabOnlyScenePath,
    scene: 'prefab-usage-prefab-only-fixture',
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
            source: 'prefab',
            sourceComponentPath: '$.components[0]',
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
        overriddenComponents: [],
        overrides: []
      }
    ]
  });
});

test('buildPrefabUsageReportV2 fails predictably for invalid prefab scenes', async () => {
  await assert.rejects(
    () => buildPrefabUsageReportV2(missingPrefabScenePath),
    /Scene validation failed/
  );
});
