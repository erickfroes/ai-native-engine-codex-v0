import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const spriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json');
const prefabOnlyScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'prefab-usage-prefab-only.scene.json'
);
const missingAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'missing.asset-manifest.json');
const invalidAssetManifestPath = path.join(
  repoRoot,
  'fixtures',
  'assets',
  'invalid.non-positive-size.asset-manifest.json'
);
const invalidTraversalAssetManifestPath = path.join(
  repoRoot,
  'fixtures',
  'assets',
  'invalid.traversal-src.asset-manifest.json'
);
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.asset-manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

async function createTempDir(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cli-render-canvas-demo-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('render-canvas-demo prints deterministic HTML to stdout when --out is omitted', () => {
  const first = runCli([
    'render-canvas-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180'
  ]);
  const second = runCli([
    'render-canvas-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180'
  ]);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.match(first.stdout, /<!DOCTYPE html>/);
  assert.match(first.stdout, /<title>tutorial Canvas 2D Demo<\/title>/);
  assert.match(first.stdout, /<canvas id="render-canvas-demo"/);
  assert.match(first.stdout, /context\.strokeRect\(drawCall\.x, drawCall\.y, drawCall\.width, drawCall\.height\);/);
});

test('render-canvas-demo writes HTML to --out and returns a small JSON envelope', async (t) => {
  const outDir = await createTempDir(t);
  const outPath = path.join(outDir, 'nested', 'tutorial-canvas.html');
  const result = runCli([
    'render-canvas-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180',
    '--out',
    outPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(payload).sort(), ['canvasDemoVersion', 'html', 'outputPath', 'scene', 'tick']);
  assert.equal(payload.canvasDemoVersion, 1);
  assert.equal(payload.scene, 'tutorial');
  assert.equal(payload.tick, 4);
  assert.equal(payload.outputPath, path.resolve(outPath));

  const writtenHtml = await readFile(payload.outputPath, 'utf8');
  assert.equal(writtenHtml, payload.html);
});

test('render-canvas-demo keeps sprite fallback intact when --asset-manifest is omitted', () => {
  const result = runCli([
    'render-canvas-demo',
    spriteScenePath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.match(payload.html, /"kind":"rect"/);
  assert.doesNotMatch(payload.html, /"kind":"sprite"/);
  assert.doesNotMatch(payload.html, /file:\/\/\//);
  assert.doesNotMatch(payload.html, /drawImage/);
});

test('render-canvas-demo with --asset-manifest keeps fully inherited prefab-backed sprite loading stable', () => {
  const result = runCli([
    'render-canvas-demo',
    prefabOnlyScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.scene, 'prefab-usage-prefab-only-fixture');
  assert.equal(payload.tick, 0);
  assert.match(payload.html, /prefab-usage-prefab-only-fixture Canvas 2D Demo/);
  assert.match(payload.html, /"kind":"sprite"/);
  assert.match(payload.html, /"id":"player\.hero"/);
  assert.match(payload.html, /"assetId":"player\.sprite"/);
  assert.match(payload.html, /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/);
  assert.match(payload.html, /"x":4,"y":3,"width":16,"height":16,"layer":2/);
  assert.match(payload.html, /const image = new Image\(\);/);
  assert.match(payload.html, /context\.drawImage\(imageState\.image, drawCall\.x, drawCall\.y, drawCall\.width, drawCall\.height\);/);
});

test('render-canvas-demo fails predictably when --asset-manifest path does not exist', () => {
  const result = runCli([
    'render-canvas-demo',
    spriteScenePath,
    '--asset-manifest',
    missingAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /missing\.asset-manifest\.json/);
});

test('render-canvas-demo fails predictably when --asset-manifest is invalid', () => {
  const result = runCli([
    'render-canvas-demo',
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

test('render-canvas-demo fails predictably when --asset-manifest src escapes manifest directory', () => {
  const result = runCli([
    'render-canvas-demo',
    spriteScenePath,
    '--asset-manifest',
    invalidTraversalAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AssetManifestValidationError: asset manifest is invalid:/);
  assert.match(result.stderr, /\$\.assets\[0\]\.src: must stay inside the manifest directory/);
});

test('render-canvas-demo fails predictably for invalid width and height flags', () => {
  const invalidWidth = runCli([
    'render-canvas-demo',
    tutorialScenePath,
    '--width',
    '0'
  ]);
  const invalidHeight = runCli([
    'render-canvas-demo',
    tutorialScenePath,
    '--height',
    '0'
  ]);

  assert.notEqual(invalidWidth.status, 0);
  assert.match(invalidWidth.stderr, /buildRenderSnapshotV1: `width` must be an integer >= 1/);
  assert.notEqual(invalidHeight.status, 0);
  assert.match(invalidHeight.stderr, /buildRenderSnapshotV1: `height` must be an integer >= 1/);
});

test('render-canvas-demo fails predictably when --out is present with an empty path value', () => {
  const result = runCli([
    'render-canvas-demo',
    tutorialScenePath,
    '--out',
    ''
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /render-canvas-demo: --out must be a non-empty string/);
});
