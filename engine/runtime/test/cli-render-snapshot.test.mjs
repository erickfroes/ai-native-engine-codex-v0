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

test('render-snapshot fails predictably for invalid numeric options', () => {
  const invalidTick = runCli(['render-snapshot', tutorialScenePath, '--tick', '-1', '--json']);
  const invalidWidth = runCli(['render-snapshot', tutorialScenePath, '--width', '0', '--json']);
  const invalidHeight = runCli(['render-snapshot', tutorialScenePath, '--height', '0', '--json']);

  assert.notEqual(invalidTick.status, 0);
  assert.match(invalidTick.stderr, /buildRenderSnapshotV1: `tick` must be an integer >= 0/);
  assert.notEqual(invalidWidth.status, 0);
  assert.match(invalidWidth.stderr, /buildRenderSnapshotV1: `width` must be an integer >= 1/);
  assert.notEqual(invalidHeight.status, 0);
  assert.match(invalidHeight.stderr, /buildRenderSnapshotV1: `height` must be an integer >= 1/);
});
