import test from 'node:test';
import assert from 'node:assert/strict';
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
const fixtureDir = path.join(testDir, 'fixtures');
const prefabScenePath = path.join(fixtureDir, 'prefab-usage.scene.json');
const missingPrefabScenePath = path.join(fixtureDir, 'invalid_prefab_missing.scene.json');
const duplicatePrefabScenePath = path.join(fixtureDir, 'invalid_prefab_duplicate_component.scene.json');

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

test('prefab scene validation fails predictably for missing and invalid prefab documents', async () => {
  const missingReport = await validateSceneFile(missingPrefabScenePath);
  const duplicateReport = await validateSceneFile(duplicatePrefabScenePath);

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
});
