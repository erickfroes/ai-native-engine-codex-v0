import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertRenderSnapshotV1 } from './helpers/assertRenderSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const spriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const invalidVisualSpriteScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_visual_sprite_asset_id.scene.json'
);
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const cameraOnlyAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.camera-only.asset-manifest.json');
const invalidAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid.non-positive-size.asset-manifest.json');
const missingAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'missing.asset-manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('render-snapshot returns deterministic RenderSnapshot v1 JSON', () => {
  const first = runCli([
    'render-snapshot',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180',
    '--json'
  ]);
  const second = runCli([
    'render-snapshot',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180',
    '--json'
  ]);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstSnapshot = JSON.parse(first.stdout);
  const secondSnapshot = JSON.parse(second.stdout);
  assertRenderSnapshotV1(firstSnapshot);
  assert.deepEqual(firstSnapshot, secondSnapshot);
  assert.deepEqual(Object.keys(firstSnapshot).sort(), [
    'drawCalls',
    'renderSnapshotVersion',
    'scene',
    'tick',
    'viewport'
  ]);
  assert.equal(firstSnapshot.scene, 'tutorial');
  assert.equal(firstSnapshot.tick, 4);
  assert.deepEqual(firstSnapshot.viewport, { width: 320, height: 180 });
  assert.deepEqual(firstSnapshot.drawCalls.map((drawCall) => drawCall.id), ['camera.main', 'player.hero']);
});

test('render-snapshot uses deterministic default options', () => {
  const result = runCli(['render-snapshot', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);

  const snapshot = JSON.parse(result.stdout);
  assertRenderSnapshotV1(snapshot);
  assert.equal(snapshot.tick, 0);
  assert.deepEqual(snapshot.viewport, { width: 320, height: 180 });
});

test('render-snapshot accepts --asset-manifest and emits deterministic sprite drawCalls', () => {
  const first = runCli([
    'render-snapshot',
    spriteScenePath,
    '--asset-manifest',
    validAssetManifestPath,
    '--json'
  ]);
  const second = runCli([
    'render-snapshot',
    spriteScenePath,
    '--asset-manifest',
    validAssetManifestPath,
    '--json'
  ]);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstSnapshot = JSON.parse(first.stdout);
  const secondSnapshot = JSON.parse(second.stdout);
  assertRenderSnapshotV1(firstSnapshot);
  assert.deepEqual(firstSnapshot, secondSnapshot);
  assert.deepEqual(firstSnapshot.drawCalls, [
    {
      kind: 'sprite',
      id: 'camera.icon',
      assetId: 'camera.icon',
      assetSrc: 'images/camera-icon.png',
      x: 6,
      y: 2,
      width: 16,
      height: 16,
      layer: 0
    },
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 10,
      y: 12,
      width: 16,
      height: 16,
      layer: 1
    }
  ]);
});

test('render-snapshot supports visual.sprite with --asset-manifest without changing JSON shape', () => {
  const first = runCli([
    'render-snapshot',
    visualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);
  const second = runCli([
    'render-snapshot',
    visualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstSnapshot = JSON.parse(first.stdout);
  const secondSnapshot = JSON.parse(second.stdout);
  assertRenderSnapshotV1(firstSnapshot);
  assert.deepEqual(Object.keys(firstSnapshot).sort(), [
    'drawCalls',
    'renderSnapshotVersion',
    'scene',
    'tick',
    'viewport'
  ]);
  assert.deepEqual(firstSnapshot, secondSnapshot);
  assert.deepEqual(firstSnapshot.drawCalls, [
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'player.sprite',
      assetSrc: 'images/player.png',
      x: 10,
      y: 12,
      width: 20,
      height: 24,
      layer: 2
    }
  ]);
});

test('render-snapshot fails predictably for invalid numeric options', () => {
  const invalidTick = runCli(['render-snapshot', tutorialScenePath, '--tick', '-1', '--json']);
  const invalidWidth = runCli(['render-snapshot', tutorialScenePath, '--width', '0', '--json']);
  const invalidHeight = runCli(['render-snapshot', tutorialScenePath, '--height', '0', '--json']);
  const invalidAssetManifest = runCli(['render-snapshot', tutorialScenePath, '--asset-manifest', '', '--json']);

  assert.notEqual(invalidTick.status, 0);
  assert.match(invalidTick.stderr, /buildRenderSnapshotV1: `tick` must be an integer >= 0/);
  assert.notEqual(invalidWidth.status, 0);
  assert.match(invalidWidth.stderr, /buildRenderSnapshotV1: `width` must be an integer >= 1/);
  assert.notEqual(invalidHeight.status, 0);
  assert.match(invalidHeight.stderr, /buildRenderSnapshotV1: `height` must be an integer >= 1/);
  assert.notEqual(invalidAssetManifest.status, 0);
  assert.match(invalidAssetManifest.stderr, /render-snapshot: --asset-manifest must be a non-empty string/);
});

test('render-snapshot fails predictably when --asset-manifest path does not exist', () => {
  const result = runCli([
    'render-snapshot',
    spriteScenePath,
    '--asset-manifest',
    missingAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /missing\.asset-manifest\.json/);
});

test('render-snapshot fails predictably when --asset-manifest is invalid', () => {
  const result = runCli([
    'render-snapshot',
    spriteScenePath,
    '--asset-manifest',
    invalidAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AssetManifestValidationError: asset manifest is invalid:/);
  assert.match(result.stderr, /\$\.assets\[0\]\.width: must be >= 1/);
  assert.match(result.stderr, /\$\.assets\[0\]\.height: must be >= 1/);
});

test('render-snapshot fails predictably when manifest does not contain a referenced assetId', () => {
  const result = runCli([
    'render-snapshot',
    spriteScenePath,
    '--asset-manifest',
    cameraOnlyAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /buildRenderSnapshotV1: entity `player\.hero` references unknown assetId `player\.sprite`/);
});

test('render-snapshot fails predictably when visual.sprite component is invalid', () => {
  const result = runCli([
    'render-snapshot',
    invalidVisualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SceneValidationError: Scene validation failed for/);
  assert.match(result.stderr, /invalid_visual_sprite_asset_id\.scene\.json/);
});
