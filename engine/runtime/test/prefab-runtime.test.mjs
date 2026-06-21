import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateSceneFile,
  loadSceneFile,
  buildRenderSnapshotV1,
  buildCollisionBoundsReportV1,
  buildPrefabUsageReportV1
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(testDir, 'fixtures');
const prefabScenePath = path.join(fixtureDir, 'prefab-usage.scene.json');
const prefabOnlyScenePath = path.join(fixtureDir, 'prefab-usage-prefab-only.scene.json');
const missingPrefabScenePath = path.join(fixtureDir, 'invalid_prefab_missing.scene.json');
const duplicatePrefabScenePath = path.join(fixtureDir, 'invalid_prefab_duplicate_component.scene.json');
const wrongExtensionPrefabScenePath = path.join(fixtureDir, 'invalid_prefab_wrong_extension.scene.json');
const unsafePrefabPathsScenePath = path.join(fixtureDir, 'invalid_prefab_unsafe_paths.scene.json');
const prefabInstancedScenePath = path.join(repoRoot, 'scenes', 'prefab-instanced.scene.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');

test('loadSceneFile resolves prefab components and preserves entity overrides deterministically', async () => {
  const first = await loadSceneFile(prefabScenePath);
  const second = await loadSceneFile(prefabScenePath);

  assert.deepEqual(first, second);

  const player = first.entities.find((entity) => entity.id === 'player.hero');
  assert.deepEqual(player.components.map((component) => component.kind), [
    'transform',
    'visual.sprite',
    'collision.bounds'
  ]);
  assert.deepEqual(player.components[0].fields, {
    x: 24,
    y: 12
  });
  assert.equal(player.prefab, './prefabs/player-actor.prefab.json');
});

test('validateSceneFile exposes prefab usage and merged summary for valid prefab scenes', async () => {
  const report = await validateSceneFile(prefabScenePath);

  assert.equal(report.ok, true);
  assert.equal(report.summary.entityCount, 2);
  assert.equal(report.summary.componentCount, 4);
  assert.deepEqual(report.prefabUsage, [
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
  ]);
});

test('loadSceneFile and validateSceneFile accept prefab-backed entities without explicit components', async () => {
  const scene = await loadSceneFile(prefabOnlyScenePath);
  const report = await validateSceneFile(prefabOnlyScenePath);

  const player = scene.entities.find((entity) => entity.id === 'player.hero');
  assert.deepEqual(player.components.map((component) => component.kind), [
    'transform',
    'visual.sprite',
    'collision.bounds'
  ]);
  assert.deepEqual(player.components[0].fields, {
    x: 4,
    y: 3
  });

  assert.equal(report.ok, true);
  assert.equal(report.summary.entityCount, 2);
  assert.equal(report.summary.componentCount, 4);
  assert.deepEqual(report.prefabUsage, [
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
  ]);
});

test('render and collision reports consume resolved prefab scenes by file path', async () => {
  const snapshot = await buildRenderSnapshotV1(prefabScenePath);
  const collisionBounds = await buildCollisionBoundsReportV1(prefabScenePath);
  const prefabUsage = await buildPrefabUsageReportV1(prefabScenePath);

  assert.deepEqual(snapshot.viewport, {
    width: 160,
    height: 90
  });
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'player.hero',
      x: 24,
      y: 12,
      width: 16,
      height: 16,
      layer: 2
    }
  ]);
  assert.deepEqual(collisionBounds, {
    collisionBoundsReportVersion: 1,
    scene: 'prefab-usage-fixture',
    bounds: [
      {
        entityId: 'player.hero',
        x: 26,
        y: 15,
        width: 12,
        height: 14,
        solid: true
      }
    ]
  });
  assert.equal(prefabUsage.prefabs.length, 1);
});

test('buildRenderSnapshotV1 renders prefab-backed visual.sprite as asset-backed sprite drawCalls when assetManifestPath is provided', async () => {
  const snapshot = await buildRenderSnapshotV1(prefabScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });

  assert.deepEqual(snapshot.viewport, {
    width: 160,
    height: 90
  });
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 24,
      y: 12,
      width: 16,
      height: 16,
      layer: 2
    }
  ]);
});

test('buildRenderSnapshotV1 renders fully inherited prefab-backed visual.sprite as asset-backed sprite drawCalls when assetManifestPath is provided', async () => {
  const snapshot = await buildRenderSnapshotV1(prefabOnlyScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });

  assert.deepEqual(snapshot.viewport, {
    width: 160,
    height: 90
  });
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 4,
      y: 3,
      width: 16,
      height: 16,
      layer: 2
    }
  ]);
});

test('prefab scene validation fails predictably for missing, invalid, wrong-extension and unsafe-path prefab documents', async () => {
  const missingReport = await validateSceneFile(missingPrefabScenePath);
  const duplicateReport = await validateSceneFile(duplicatePrefabScenePath);
  const wrongExtensionReport = await validateSceneFile(wrongExtensionPrefabScenePath);
  const unsafePathsReport = await validateSceneFile(unsafePrefabPathsScenePath);

  assert.equal(missingReport.ok, false);
  assert.ok(
    missingReport.errors.some(
      (error) =>
        error.path === '$.entities[0].prefab' &&
        error.message.includes('prefab `./prefabs/missing.prefab.json` is invalid: prefab file was not found')
    )
  );

  assert.equal(duplicateReport.ok, false);
  assert.ok(
    duplicateReport.errors.some(
      (error) =>
        error.path === '$.entities[0].prefab' &&
        error.message.includes('duplicate component kind in prefab: visual.sprite')
      )
  );

  assert.equal(wrongExtensionReport.ok, false);
  assert.ok(
    wrongExtensionReport.errors.some(
      (error) =>
        error.path === '$.entities[0].prefab' &&
        error.message === 'prefab must reference a .prefab.json file'
    )
  );

  assert.equal(unsafePathsReport.ok, false);
  assert.deepEqual(unsafePathsReport.errors, [
    {
      path: '$.entities[0].prefab',
      message: 'prefab must be a safe relative path'
    },
    {
      path: '$.entities[1].prefab',
      message: 'prefab must be a safe relative path'
    },
    {
      path: '$.entities[2].prefab',
      message: 'prefab must be a safe relative path'
    },
    {
      path: '$.entities[3].prefab',
      message: 'prefab must be a safe relative path'
    }
  ]);
});

test('prefab-instanced scene reuses one prefab across multiple entities without introducing new semantics', async () => {
  const authoringScene = JSON.parse(await readFile(prefabInstancedScenePath, 'utf8'));
  const scene = await loadSceneFile(prefabInstancedScenePath);
  const report = await validateSceneFile(prefabInstancedScenePath);
  const snapshot = await buildRenderSnapshotV1(prefabInstancedScenePath);
  const collisionBounds = await buildCollisionBoundsReportV1(prefabInstancedScenePath);
  const prefabUsage = await buildPrefabUsageReportV1(prefabInstancedScenePath);

  assert.equal(
    authoringScene.entities.filter((entity) => entity.prefab === './prefabs/player-actor.prefab.json').length,
    3
  );
  assert.equal('components' in authoringScene.entities.find((entity) => entity.id === 'player.hero'), false);

  const hero = scene.entities.find((entity) => entity.id === 'player.hero');
  const scout = scene.entities.find((entity) => entity.id === 'player.scout');
  const support = scene.entities.find((entity) => entity.id === 'player.support');

  assert.deepEqual(hero.components.map((component) => component.kind), [
    'transform',
    'visual.sprite',
    'collision.bounds'
  ]);
  assert.deepEqual(hero.components[0].fields, {
    x: 4,
    y: 3
  });
  assert.deepEqual(scout.components[0].fields, {
    x: 24,
    y: 12
  });
  assert.deepEqual(support.components[0].fields, {
    x: 44,
    y: 12
  });

  assert.equal(report.ok, true);
  assert.equal(report.summary.entityCount, 4);
  assert.equal(report.summary.componentCount, 10);
  assert.deepEqual(report.prefabUsage, [
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
    },
    {
      entityId: 'player.scout',
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
    },
    {
      entityId: 'player.support',
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
  ]);
  assert.deepEqual(prefabUsage.prefabs, report.prefabUsage);

  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'player.hero',
      x: 4,
      y: 3,
      width: 16,
      height: 16,
      layer: 2
    },
    {
      kind: 'rect',
      id: 'player.scout',
      x: 24,
      y: 12,
      width: 16,
      height: 16,
      layer: 2
    },
    {
      kind: 'rect',
      id: 'player.support',
      x: 44,
      y: 12,
      width: 16,
      height: 16,
      layer: 2
    }
  ]);
  assert.deepEqual(collisionBounds, {
    collisionBoundsReportVersion: 1,
    scene: 'prefab-instanced',
    bounds: [
      {
        entityId: 'player.hero',
        x: 6,
        y: 6,
        width: 12,
        height: 14,
        solid: true
      },
      {
        entityId: 'player.scout',
        x: 26,
        y: 15,
        width: 12,
        height: 14,
        solid: true
      },
      {
        entityId: 'player.support',
        x: 46,
        y: 15,
        width: 12,
        height: 14,
        solid: true
      }
    ]
  });
});
