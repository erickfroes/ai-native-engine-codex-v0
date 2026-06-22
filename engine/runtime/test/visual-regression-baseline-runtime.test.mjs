import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildRenderSnapshotV1,
  buildVisualRegressionBaselineReportV1,
  renderSnapshotToSvgV1,
  sha256Hex
} from '../src/index.mjs';
import { assertVisualRegressionBaselineReportV1 } from './helpers/assertVisualRegressionBaselineReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const v1SmallScenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');
const unsafePrefabPathsScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_prefab_unsafe_paths.scene.json'
);

test('buildVisualRegressionBaselineReportV1 creates a deterministic baseline for v1-small-2d', async () => {
  const first = await buildVisualRegressionBaselineReportV1(v1SmallScenePath);
  const second = await buildVisualRegressionBaselineReportV1(v1SmallScenePath);

  assertVisualRegressionBaselineReportV1(first);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    visualRegressionBaselineReportVersion: 1,
    scene: 'v1-small-2d',
    tick: 0,
    viewport: {
      width: 32,
      height: 24
    },
    renderSnapshotVersion: 1,
    svgVersion: 1,
    hashAlgorithm: 'sha256',
    snapshotHash: 'e3981b0f8c68a2ad1a4e9b7fda67750794b462a84b7f24687abfbcb6b1d99ce0',
    svgHash: '296a7e3ab6c2f3a56a4c4727d95ed804214622bab672d706d0c9db4db57dc3ef',
    drawCallCount: 23,
    drawCallsByKind: {
      rect: 23,
      sprite: 0
    },
    layers: [
      {
        layer: -10,
        count: 20
      },
      {
        layer: 0,
        count: 2
      },
      {
        layer: 5,
        count: 1
      }
    ],
    uniqueSpriteAssetIds: []
  });
});

test('buildVisualRegressionBaselineReportV1 captures asset-backed visual.sprite summaries', async () => {
  const report = await buildVisualRegressionBaselineReportV1(visualSpriteScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });

  assertVisualRegressionBaselineReportV1(report);
  assert.deepEqual(report, {
    visualRegressionBaselineReportVersion: 1,
    scene: 'visual-sprite-fixture',
    tick: 0,
    viewport: {
      width: 320,
      height: 180
    },
    renderSnapshotVersion: 1,
    svgVersion: 1,
    hashAlgorithm: 'sha256',
    snapshotHash: '54e907fd7a2e0fe49e5427e51bc4be2cb00da5c49f116d42bee8c699fc0a3857',
    svgHash: '53bfa135ce5cb277f2cdc6308f3a2d509d07e7df7bd678f059b8114c9867ccdb',
    drawCallCount: 1,
    drawCallsByKind: {
      rect: 0,
      sprite: 1
    },
    layers: [
      {
        layer: 2,
        count: 1
      }
    ],
    uniqueSpriteAssetIds: ['player.sprite']
  });
});

test('buildVisualRegressionBaselineReportV1 hashes RenderSnapshot v1 and Render SVG v1 sources', async () => {
  const snapshot = await buildRenderSnapshotV1(v1SmallScenePath);
  const svg = renderSnapshotToSvgV1(snapshot);
  const report = await buildVisualRegressionBaselineReportV1(v1SmallScenePath);

  assert.equal(report.renderSnapshotVersion, snapshot.renderSnapshotVersion);
  assert.equal(report.snapshotHash, sha256Hex(snapshot));
  assert.equal(report.svgHash, sha256Hex(svg));
});

test('buildVisualRegressionBaselineReportV1 delegates render option validation predictably', async () => {
  await assert.rejects(
    () => buildVisualRegressionBaselineReportV1(v1SmallScenePath, { tick: -1 }),
    /buildRenderSnapshotV1: `tick` must be an integer >= 0/
  );

  await assert.rejects(
    () => buildVisualRegressionBaselineReportV1(v1SmallScenePath, null),
    /buildVisualRegressionBaselineReportV1: `options` must be an object/
  );
});

test('buildVisualRegressionBaselineReportV1 preserves scene validation failures', async () => {
  await assert.rejects(
    () => buildVisualRegressionBaselineReportV1(unsafePrefabPathsScenePath),
    /Scene validation failed/
  );
});
