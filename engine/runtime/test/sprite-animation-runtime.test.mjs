import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSpriteAnimationReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures');
const idleFixturePath = path.join(fixtureDir, 'sprite-animation-idle.scene.json');
const missingVisualSpriteFixturePath = path.join(fixtureDir, 'sprite-animation-missing-visual-sprite.scene.json');
const invalidFrameFixturePath = path.join(fixtureDir, 'invalid_sprite_animation_frame.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('buildSpriteAnimationReportV1 returns empty report for scenes without visual.sprite.animation', async () => {
  const report = await buildSpriteAnimationReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    spriteAnimationReportVersion: 1,
    scene: 'tutorial',
    animations: [],
    warnings: [],
    invalidRefs: []
  });
});

test('buildSpriteAnimationReportV1 returns deterministic sprite animation frames', async () => {
  const first = await buildSpriteAnimationReportV1(idleFixturePath);
  const second = await buildSpriteAnimationReportV1(idleFixturePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    spriteAnimationReportVersion: 1,
    scene: 'sprite-animation-idle-fixture',
    animations: [
      {
        entityId: 'player.hero',
        animationId: 'player.idle',
        assetId: 'player.sprite',
        frameWidth: 16,
        frameHeight: 16,
        fps: 8,
        loop: true,
        state: 'idle',
        frames: [
          {
            x: 0,
            y: 0,
            index: 0
          },
          {
            x: 16,
            y: 0,
            index: 1
          }
        ]
      }
    ],
    warnings: [],
    invalidRefs: []
  });
});

test('buildSpriteAnimationReportV1 defaults raw scene animation loop and state deterministically', async () => {
  const report = await buildSpriteAnimationReportV1({
    version: 1,
    metadata: { name: 'raw-sprite-animation' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'z.hero',
        components: [
          {
            kind: 'visual.sprite',
            version: 1,
            replicated: false,
            fields: {
              assetId: 'hero.z',
              width: 16,
              height: 16
            }
          },
          {
            kind: 'visual.sprite.animation',
            version: 1,
            replicated: false,
            fields: {
              animationId: 'z.walk',
              assetId: 'hero.z',
              frameWidth: 16,
              frameHeight: 16,
              frames: [{ x: 0, y: 0 }],
              fps: 10
            }
          }
        ]
      },
      {
        id: 'a.hero',
        components: [
          {
            kind: 'visual.sprite',
            version: 1,
            replicated: false,
            fields: {
              assetId: 'hero.a',
              width: 16,
              height: 16
            }
          },
          {
            kind: 'visual.sprite.animation',
            version: 1,
            replicated: false,
            fields: {
              animationId: 'a.idle',
              assetId: 'hero.a',
              frameWidth: 16,
              frameHeight: 16,
              frames: [{ x: 16, y: 0 }],
              fps: 8,
              loop: false,
              state: 'idle'
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(report.animations.map((animation) => animation.animationId), ['a.idle', 'z.walk']);
  assert.equal(report.animations[0].loop, false);
  assert.equal(report.animations[0].state, 'idle');
  assert.equal(report.animations[1].loop, true);
  assert.equal(report.animations[1].state, 'default');
});

test('buildSpriteAnimationReportV1 reports animation assets not referenced by visual.sprite', async () => {
  const report = await buildSpriteAnimationReportV1(missingVisualSpriteFixturePath);

  assert.deepEqual(report.invalidRefs, [
    {
      entityId: 'player.hero',
      animationId: 'player.idle',
      assetId: 'player.missing',
      reason: 'SPRITE_ANIMATION_ASSET_NOT_IN_VISUAL_SPRITE'
    }
  ]);
  assert.deepEqual(report.warnings, [
    {
      code: 'SPRITE_ANIMATION_ASSET_NOT_IN_VISUAL_SPRITE',
      entityId: 'player.hero',
      animationId: 'player.idle',
      message: 'assetId not referenced by visual.sprite: player.missing'
    }
  ]);
});

test('buildSpriteAnimationReportV1 fails predictably for invalid raw sprite animation scene objects', async () => {
  await assert.rejects(
    () => buildSpriteAnimationReportV1({
      version: 1,
      metadata: { name: 'invalid-raw-sprite-animation' },
      systems: ['core.loop'],
      entities: [
        {
          id: 'player.hero',
          components: [
            {
              kind: 'visual.sprite.animation',
              version: 1,
              replicated: false,
              fields: {
                animationId: 'player.idle',
                assetId: 'player.sprite',
                frameWidth: 16,
                frameHeight: 16,
                frames: [{ x: 0, y: 0 }],
                fps: 0
              }
            }
          ]
        }
      ]
    }),
    /buildSpriteAnimationReportV1: scene object is invalid: .*visual\.sprite\.animation fps must be an integer between 1 and 60/
  );
});

test('buildSpriteAnimationReportV1 fails predictably for invalid sprite animation scene files', async () => {
  await assert.rejects(
    () => buildSpriteAnimationReportV1(invalidFrameFixturePath),
    /Scene validation failed for .*invalid_sprite_animation_frame\.scene\.json/
  );
});
