import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCollisionBoundsReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixturePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-bounds.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('buildCollisionBoundsReportV1 creates deterministic bounds from a scene path', async () => {
  const first = await buildCollisionBoundsReportV1(fixturePath);
  const second = await buildCollisionBoundsReportV1(fixturePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
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

test('buildCollisionBoundsReportV1 returns empty bounds for scenes without collision.bounds', async () => {
  const report = await buildCollisionBoundsReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    collisionBoundsReportVersion: 1,
    scene: 'tutorial',
    bounds: []
  });
});

test('buildCollisionBoundsReportV1 supports scene objects, local offsets, solid defaults and entityId ordering', async () => {
  const report = await buildCollisionBoundsReportV1({
    version: 1,
    metadata: { name: 'raw-collision-bounds' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'z.block',
        components: [
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: {
              x: -2,
              y: 3,
              width: 8,
              height: 9,
              solid: false
            }
          }
        ]
      },
      {
        id: 'a.player',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: {
              position: {
                x: 20,
                y: 30
              }
            }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: {
              width: 4,
              height: 5
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(report.bounds, [
    {
      entityId: 'a.player',
      x: 20,
      y: 30,
      width: 4,
      height: 5,
      solid: true
    },
    {
      entityId: 'z.block',
      x: -2,
      y: 3,
      width: 8,
      height: 9,
      solid: false
    }
  ]);
});

test('buildCollisionBoundsReportV1 does not detect or resolve collisions', async () => {
  const report = await buildCollisionBoundsReportV1({
    version: 1,
    metadata: { name: 'overlapping-bounds' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'a',
        components: [
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 16, height: 16 }
          }
        ]
      },
      {
        id: 'b',
        components: [
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 16, height: 16 }
          }
        ]
      }
    ]
  });

  assert.equal('collisions' in report, false);
  assert.equal(report.bounds.length, 2);
});
