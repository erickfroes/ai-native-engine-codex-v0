import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCollisionOverlapReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const overlapFixturePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-overlap.scene.json');
const noOverlapFixturePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'collision-no-overlap.scene.json'
);
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('buildCollisionOverlapReportV1 detects deterministic AABB overlaps from a scene path', async () => {
  const first = await buildCollisionOverlapReportV1(overlapFixturePath);
  const second = await buildCollisionOverlapReportV1(overlapFixturePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
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

test('buildCollisionOverlapReportV1 returns empty overlaps when bounds do not overlap', async () => {
  const report = await buildCollisionOverlapReportV1(noOverlapFixturePath);

  assert.deepEqual(report, {
    collisionOverlapReportVersion: 1,
    scene: 'collision-no-overlap-fixture',
    overlaps: []
  });
});

test('buildCollisionOverlapReportV1 returns empty overlaps when scene has no collision.bounds', async () => {
  const report = await buildCollisionOverlapReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    collisionOverlapReportVersion: 1,
    scene: 'tutorial',
    overlaps: []
  });
});

test('buildCollisionOverlapReportV1 treats touching AABB edges as no overlap', async () => {
  const report = await buildCollisionOverlapReportV1({
    version: 1,
    metadata: { name: 'touching-aabb-edges' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'left.box',
        components: [
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { x: 0, y: 0, width: 8, height: 8 }
          }
        ]
      },
      {
        id: 'right.box',
        components: [
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { x: 8, y: 0, width: 8, height: 8 }
          }
        ]
      }
    ]
  });

  assert.deepEqual(report.overlaps, []);
});

test('buildCollisionOverlapReportV1 reuses collision bounds validation for raw scene objects', async () => {
  await assert.rejects(
    () => buildCollisionOverlapReportV1({
      version: 1,
      metadata: { name: 'invalid-raw-overlap' },
      systems: ['core.loop'],
      entities: [
        {
          id: 'bad.box',
          components: [
            {
              kind: 'collision.bounds',
              version: 1,
              replicated: false,
              fields: { width: 0, height: 8 }
            }
          ]
        }
      ]
    }),
    /buildCollisionBoundsReportV1: scene object is invalid: \$\.entities\[0\]\.components\[0\]\.fields\.width: collision\.bounds width must be an integer >= 1/
  );
});
