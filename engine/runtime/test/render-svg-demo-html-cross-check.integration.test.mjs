import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildRenderSnapshotV1,
  renderSnapshotToSvgV1,
  renderSvgDemoHtmlV1,
  RENDER_SVG_VERSION,
  SVG_DEMO_HTML_VERSION
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const prefabOnlyScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'prefab-usage-prefab-only.scene.json');
const portableEmptyVisualScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'portable-empty-visual.scene.json'
);
const unsafePrefabPathsScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'invalid_prefab_unsafe_paths.scene.json'
);
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function assertUnsafePrefabSceneValidationError(error) {
  assert.equal(error.name, 'SceneValidationError');
  assert.match(error.message, /Scene validation failed/);
  assert.equal(error.report?.errors?.length, 4);
  for (const reportError of error.report.errors) {
    assert.match(reportError.message, /prefab must be a safe relative path/);
  }
  return true;
}

test('render-svg-demo stays aligned with runtime SVG output for the same scene options', async () => {
  const tick = 4;
  const width = 320;
  const height = 180;
  const snapshot = await buildRenderSnapshotV1(tutorialScenePath, { tick, width, height });
  const svg = renderSnapshotToSvgV1(snapshot);
  const runtimeHtml = renderSvgDemoHtmlV1({
    title: `${snapshot.scene} SVG Demo`,
    svg,
    metadata: {
      scene: snapshot.scene,
      svgVersion: RENDER_SVG_VERSION,
      tick: snapshot.tick,
      viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
    }
  });

  const result = runCli([
    'render-svg-demo',
    tutorialScenePath,
    '--tick',
    String(tick),
    '--width',
    String(width),
    '--height',
    String(height),
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.demoHtmlVersion, SVG_DEMO_HTML_VERSION);
  assert.equal(payload.scene, snapshot.scene);
  assert.equal(payload.tick, snapshot.tick);
  assert.equal(payload.html, runtimeHtml);
  assert.ok(payload.html.includes(svg));
});

test('render-svg-demo keeps empty drawCalls aligned with runtime HTML for scenes without visual components', async () => {
  const snapshot = await buildRenderSnapshotV1(portableEmptyVisualScenePath);
  const svg = renderSnapshotToSvgV1(snapshot);
  const runtimeHtml = renderSvgDemoHtmlV1({
    title: `${snapshot.scene} SVG Demo`,
    svg,
    metadata: {
      scene: snapshot.scene,
      svgVersion: RENDER_SVG_VERSION,
      tick: snapshot.tick,
      viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
    }
  });

  const result = runCli([
    'render-svg-demo',
    portableEmptyVisualScenePath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.demoHtmlVersion, SVG_DEMO_HTML_VERSION);
  assert.equal(payload.scene, snapshot.scene);
  assert.equal(payload.tick, snapshot.tick);
  assert.equal(payload.html, runtimeHtml);
  assert.match(payload.html, /portable-empty-visual-fixture SVG Demo/);
  assert.match(payload.html, /data-scene="portable-empty-visual-fixture"/);
  assert.doesNotMatch(payload.html, /<rect\b/);
  assert.doesNotMatch(payload.html, /data-asset-id=/);
});

test('render-svg-demo keeps fully inherited prefab-backed sprite fallback SVG aligned with runtime HTML when assetManifestPath is provided', async () => {
  const snapshot = await buildRenderSnapshotV1(prefabOnlyScenePath, {
    assetManifestPath: visualSpriteAssetManifestPath
  });
  const svg = renderSnapshotToSvgV1(snapshot);
  const runtimeHtml = renderSvgDemoHtmlV1({
    title: `${snapshot.scene} SVG Demo`,
    svg,
    metadata: {
      scene: snapshot.scene,
      svgVersion: RENDER_SVG_VERSION,
      tick: snapshot.tick,
      viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
    }
  });

  const result = runCli([
    'render-svg-demo',
    prefabOnlyScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.demoHtmlVersion, SVG_DEMO_HTML_VERSION);
  assert.equal(payload.scene, snapshot.scene);
  assert.equal(payload.tick, snapshot.tick);
  assert.equal(payload.html, runtimeHtml);
  assert.match(payload.html, /prefab-usage-prefab-only-fixture SVG Demo/);
  assert.match(
    payload.html,
    /<rect id="player\.hero" data-asset-id="player\.sprite" data-kind="sprite" data-layer="2" x="4" y="3" width="16" height="16" \/>/
  );
  assert.doesNotMatch(payload.html, /assetSrc|file:\/\/\//);
});

test('render-svg-demo fails predictably for unsafe prefab path references', async () => {
  await assert.rejects(
    () => buildRenderSnapshotV1(unsafePrefabPathsScenePath),
    assertUnsafePrefabSceneValidationError
  );

  const result = runCli([
    'render-svg-demo',
    unsafePrefabPathsScenePath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SceneValidationError: Scene validation failed for/);
  assert.match(result.stderr, /invalid_prefab_unsafe_paths\.scene\.json/);
});

test('render-svg-demo stays deterministic for the same scene options', () => {
  const args = [
    'render-svg-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180',
    '--json'
  ];
  const first = runCli(args);
  const second = runCli(args);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
});
