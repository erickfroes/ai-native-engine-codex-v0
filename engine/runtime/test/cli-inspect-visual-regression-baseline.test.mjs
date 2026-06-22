import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertVisualRegressionBaselineReportV1 } from './helpers/assertVisualRegressionBaselineReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const v1SmallScenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const missingAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'missing.asset-manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-visual-regression-baseline returns deterministic VisualRegressionBaselineReport v1 JSON', () => {
  const first = runCli(['inspect-visual-regression-baseline', v1SmallScenePath, '--json']);
  const second = runCli(['inspect-visual-regression-baseline', v1SmallScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  assertVisualRegressionBaselineReportV1(firstReport);
  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.scene, 'v1-small-2d');
  assert.equal(firstReport.drawCallCount, 23);
  assert.equal(firstReport.snapshotHash, 'e3981b0f8c68a2ad1a4e9b7fda67750794b462a84b7f24687abfbcb6b1d99ce0');
  assert.equal(firstReport.svgHash, '296a7e3ab6c2f3a56a4c4727d95ed804214622bab672d706d0c9db4db57dc3ef');
});

test('inspect-visual-regression-baseline supports asset manifest sprite baselines', () => {
  const result = runCli([
    'inspect-visual-regression-baseline',
    visualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assertVisualRegressionBaselineReportV1(report);
  assert.equal(report.scene, 'visual-sprite-fixture');
  assert.deepEqual(report.drawCallsByKind, { rect: 0, sprite: 1 });
  assert.deepEqual(report.uniqueSpriteAssetIds, ['player.sprite']);
});

test('inspect-visual-regression-baseline emits a compact readable summary', () => {
  const result = runCli([
    'inspect-visual-regression-baseline',
    visualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: visual-sprite-fixture/);
  assert.match(result.stdout, /Visual regression baseline report version: 1/);
  assert.match(result.stdout, /Draw calls: 1 \(rect=0, sprite=1\)/);
  assert.match(result.stdout, /Snapshot hash: 54e907fd7a2e0fe49e5427e51bc4be2cb00da5c49f116d42bee8c699fc0a3857/);
  assert.match(result.stdout, /SVG hash: 53bfa135ce5cb277f2cdc6308f3a2d509d07e7df7bd678f059b8114c9867ccdb/);
});

test('inspect-visual-regression-baseline fails predictably for invalid options', () => {
  const invalidTick = runCli(['inspect-visual-regression-baseline', v1SmallScenePath, '--tick', '-1', '--json']);
  const invalidWidth = runCli(['inspect-visual-regression-baseline', v1SmallScenePath, '--width', '0', '--json']);
  const invalidAssetManifest = runCli([
    'inspect-visual-regression-baseline',
    v1SmallScenePath,
    '--asset-manifest',
    '',
    '--json'
  ]);

  assert.notEqual(invalidTick.status, 0);
  assert.match(invalidTick.stderr, /buildRenderSnapshotV1: `tick` must be an integer >= 0/);
  assert.notEqual(invalidWidth.status, 0);
  assert.match(invalidWidth.stderr, /buildRenderSnapshotV1: `width` must be an integer >= 1/);
  assert.notEqual(invalidAssetManifest.status, 0);
  assert.match(invalidAssetManifest.stderr, /inspect-visual-regression-baseline: --asset-manifest must be a non-empty string/);
});

test('inspect-visual-regression-baseline fails predictably when asset manifest path does not exist', () => {
  const result = runCli([
    'inspect-visual-regression-baseline',
    visualSpriteScenePath,
    '--asset-manifest',
    missingAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /missing\.asset-manifest\.json/);
});
