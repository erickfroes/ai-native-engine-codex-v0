import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures');
const idleScenePath = path.join(fixtureDir, 'sprite-animation-idle.scene.json');
const missingVisualSpriteScenePath = path.join(fixtureDir, 'sprite-animation-missing-visual-sprite.scene.json');
const invalidScenePath = path.join(fixtureDir, 'invalid_sprite_animation_frame.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-sprite-animation returns deterministic SpriteAnimationReport v1 JSON', () => {
  const first = runCli(['inspect-sprite-animation', idleScenePath, '--json']);
  const second = runCli(['inspect-sprite-animation', idleScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);

  const report = JSON.parse(first.stdout);
  assert.equal(report.spriteAnimationReportVersion, 1);
  assert.equal(report.scene, 'sprite-animation-idle-fixture');
  assert.deepEqual(report.animations.map((animation) => animation.animationId), ['player.idle']);
  assert.deepEqual(report.animations[0].frames, [
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
  ]);
  assert.deepEqual(report.warnings, []);
});

test('inspect-sprite-animation returns empty reports for scenes without visual.sprite.animation', () => {
  const result = runCli(['inspect-sprite-animation', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    spriteAnimationReportVersion: 1,
    scene: 'tutorial',
    animations: [],
    warnings: [],
    invalidRefs: []
  });
});

test('inspect-sprite-animation reports animation assets not referenced by visual.sprite', () => {
  const result = runCli(['inspect-sprite-animation', missingVisualSpriteScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.invalidRefs, [
    {
      entityId: 'player.hero',
      animationId: 'player.idle',
      assetId: 'player.missing',
      reason: 'SPRITE_ANIMATION_ASSET_NOT_IN_VISUAL_SPRITE'
    }
  ]);
});

test('inspect-sprite-animation prints stable readable output without --json', () => {
  const result = runCli(['inspect-sprite-animation', idleScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Sprite Animation report version: 1/);
  assert.match(result.stdout, /Scene: sprite-animation-idle-fixture/);
  assert.match(result.stdout, /Animations: 1/);
  assert.match(result.stdout, /Warnings: 0/);
  assert.match(result.stdout, /Invalid refs: 0/);
});

test('inspect-sprite-animation fails predictably for invalid sprite animation scenes', () => {
  const result = runCli(['inspect-sprite-animation', invalidScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_sprite_animation_frame\.scene\.json/);
});
