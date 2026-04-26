import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCollisionOverlapReportV1,
  buildMovementBlockingReportV1
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const blockedScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-blocked.scene.json'
);
const openScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-open.scene.json'
);
const nonSolidScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-non-solid.scene.json'
);
const overlapScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'collision-overlap.scene.json');

const moveRightInputIntent = {
  inputIntentVersion: 1,
  tick: 1,
  entityId: 'player.hero',
  actions: [
    {
      type: 'move',
      axis: { x: 1, y: 0 }
    }
  ]
};

test('buildMovementBlockingReportV1 blocks movement that would overlap a solid bound', async () => {
  const first = await buildMovementBlockingReportV1(blockedScenePath, { inputIntent: moveRightInputIntent });
  const second = await buildMovementBlockingReportV1(blockedScenePath, { inputIntent: moveRightInputIntent });

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-blocked-fixture',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 1, y: 0 },
    final: { x: 0, y: 0 },
    blocked: true,
    blockingEntities: ['wall.block']
  });
});

test('buildMovementBlockingReportV1 allows movement when no solid overlap is introduced', async () => {
  const report = await buildMovementBlockingReportV1(openScenePath, { inputIntent: moveRightInputIntent });

  assert.deepEqual(report, {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-open-fixture',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 1, y: 0 },
    final: { x: 1, y: 0 },
    blocked: false,
    blockingEntities: []
  });
});

test('buildMovementBlockingReportV1 does not block on non-solid overlap', async () => {
  const report = await buildMovementBlockingReportV1(nonSolidScenePath, { inputIntent: moveRightInputIntent });

  assert.equal(report.blocked, false);
  assert.deepEqual(report.blockingEntities, []);
  assert.deepEqual(report.final, { x: 1, y: 0 });
});

test('buildMovementBlockingReportV1 returns a stable no-op report when attempted move is zero', async () => {
  const report = await buildMovementBlockingReportV1(blockedScenePath, {
    inputIntent: {
      ...moveRightInputIntent,
      tick: 2,
      actions: [
        {
          type: 'move',
          axis: { x: 0, y: 0 }
        }
      ]
    }
  });

  assert.deepEqual(report, {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-blocked-fixture',
    entityId: 'player.hero',
    inputIntentTick: 2,
    attemptedMove: { x: 0, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 0, y: 0 },
    final: { x: 0, y: 0 },
    blocked: false,
    blockingEntities: []
  });
});

test('buildMovementBlockingReportV1 errors predictably when the input entity is missing', async () => {
  await assert.rejects(
    () => buildMovementBlockingReportV1(openScenePath, {
      inputIntent: {
        ...moveRightInputIntent,
        entityId: 'missing.entity'
      }
    }),
    /buildMovementBlockingReportV1: entity `missing\.entity` was not found in scene/
  );
});

test('buildMovementBlockingReportV1 uses 0,0 when the target entity has no transform', async () => {
  const report = await buildMovementBlockingReportV1({
    version: 1,
    metadata: { name: 'movement-blocking-no-transform' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      },
      {
        id: 'wall.block',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 8, y: 0 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      }
    ]
  }, { inputIntent: moveRightInputIntent });

  assert.deepEqual(report, {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-no-transform',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 1, y: 0 },
    final: { x: 0, y: 0 },
    blocked: true,
    blockingEntities: ['wall.block']
  });
});

test('buildMovementBlockingReportV1 does not block when the target entity has no collision.bounds', async () => {
  const report = await buildMovementBlockingReportV1({
    version: 1,
    metadata: { name: 'movement-blocking-no-target-bounds' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 4, y: 5 }
          }
        ]
      },
      {
        id: 'wall.block',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 5, y: 5 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      }
    ]
  }, { inputIntent: moveRightInputIntent });

  assert.deepEqual(report, {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-no-target-bounds',
    entityId: 'player.hero',
    inputIntentTick: 1,
    attemptedMove: { x: 1, y: 0 },
    from: { x: 4, y: 5 },
    candidate: { x: 5, y: 5 },
    final: { x: 5, y: 5 },
    blocked: false,
    blockingEntities: []
  });
});

test('buildMovementBlockingReportV1 treats missing move actions as a deterministic zero move', async () => {
  const report = await buildMovementBlockingReportV1(blockedScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 3,
      entityId: 'player.hero',
      actions: []
    }
  });

  assert.deepEqual(report, {
    movementBlockingReportVersion: 1,
    scene: 'movement-blocking-blocked-fixture',
    entityId: 'player.hero',
    inputIntentTick: 3,
    attemptedMove: { x: 0, y: 0 },
    from: { x: 0, y: 0 },
    candidate: { x: 0, y: 0 },
    final: { x: 0, y: 0 },
    blocked: false,
    blockingEntities: []
  });
});

test('buildMovementBlockingReportV1 reports multiple solid blockers in deterministic entityId order', async () => {
  const first = await buildMovementBlockingReportV1({
    version: 1,
    metadata: { name: 'movement-blocking-multiple-blockers' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 0, y: 0 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      },
      {
        id: 'zeta.block',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 8, y: 0 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      },
      {
        id: 'alpha.block',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 8, y: 1 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      }
    ]
  }, { inputIntent: moveRightInputIntent });
  const second = await buildMovementBlockingReportV1({
    version: 1,
    metadata: { name: 'movement-blocking-multiple-blockers' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 0, y: 0 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      },
      {
        id: 'alpha.block',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 8, y: 1 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      },
      {
        id: 'zeta.block',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 8, y: 0 }
          },
          {
            kind: 'collision.bounds',
            version: 1,
            replicated: false,
            fields: { width: 8, height: 8 }
          }
        ]
      }
    ]
  }, { inputIntent: moveRightInputIntent });

  assert.deepEqual(first, second);
  assert.equal(first.blocked, true);
  assert.deepEqual(first.blockingEntities, ['alpha.block', 'zeta.block']);
  assert.deepEqual(first.final, first.from);
});

test('buildMovementBlockingReportV1 keeps CollisionOverlapReport v1 intact', async () => {
  const report = await buildCollisionOverlapReportV1(overlapScenePath);

  assert.deepEqual(report, {
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
