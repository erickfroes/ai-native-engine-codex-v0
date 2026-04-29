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
const v1Small2dScenePath = path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json');
const spriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'sprite.scene.json');
const visualSpriteScenePath = path.join(repoRoot, 'fixtures', 'assets', 'visual-sprite.scene.json');
const movementBlockingTileBlockedScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-tile-blocked.scene.json'
);
const movementBlockingTileOpenScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'movement-blocking-tile-open.scene.json'
);
const audioLiteSfxScenePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'audio-lite-sfx.scene.json'
);
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
const invalidAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'missing.asset-manifest.json');
const invalidRelativeAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid.non-positive-size.asset-manifest.json');
const invalidTraversalAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid.traversal-src.asset-manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

function assertBrowserDemoEnvelopeShape(payload, { hasOutputPath }) {
  const expectedKeys = hasOutputPath
    ? ['browserDemoVersion', 'scene', 'tick', 'outputPath', 'html']
    : ['browserDemoVersion', 'scene', 'tick', 'html'];
  assert.deepEqual(Object.keys(payload), expectedKeys);
}

function assertBrowserDemoHtmlSurface(html) {
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<canvas id="browser-playable-demo-canvas"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-label="Browser playable demo canvas"/);
  assert.match(html, /requestAnimationFrame\(renderFrame\)/);
  assert.match(html, />Pause rendering<\/button>/);
  assert.match(html, />Reset position<\/button>/);
  assert.match(
    html,
    /Click the canvas, then use Arrow Keys or WASD to move the highlighted rectangle by 4 px per keydown\./
  );
}

function assertBrowserDemoHtmlWithImageLoadingSurface(html) {
  assert.match(html, /new Image\(\)/);
  assert.match(html, /drawImage\(/);
  assert.match(html, /assetSrc/);
  assert.match(html, /requestAnimationFrame\(renderFrame\)/);
  assert.doesNotMatch(
    html,
    /<script[^>]+src=|<link[^>]+href=|https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|import\(|setTimeout|setInterval|Date\.now|new Date|performance\.now|localStorage|sessionStorage|IndexedDB/
  );
}

function assertNoForbiddenBrowserDemoHtmlSurface(html) {
  assert.doesNotMatch(
    html,
    /<script[^>]+src=|<link[^>]+href=|https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|import\(|setTimeout|setInterval|Date\.now|new Date|performance\.now|localStorage|sessionStorage|IndexedDB/
  );
}

async function createTempDir(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cli-render-browser-demo-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('render-browser-demo prints deterministic HTML to stdout when --out is omitted', () => {
  const args = [
    'render-browser-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180'
  ];
  const first = runCli(args);
  const second = runCli(args);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  assert.match(first.stdout, /<title>tutorial Browser Playable Demo<\/title>/);
  assertBrowserDemoHtmlSurface(first.stdout);
  assert.match(first.stdout, /addEventListener\("keydown"/);
  assert.doesNotMatch(
    first.stdout,
    /<script[^>]+src=|https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|Date\.now|new Date|performance\.now|localStorage/
  );
});

test('render-browser-demo writes HTML to --out and returns a small JSON envelope', async (t) => {
  const outDir = await createTempDir(t);
  const outPath = path.join(outDir, 'nested', 'tutorial-browser-demo.html');
  const result = runCli([
    'render-browser-demo',
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
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: true });
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, 'tutorial');
  assert.equal(payload.tick, 4);
  assert.equal(payload.outputPath, path.resolve(outPath));
  assertBrowserDemoHtmlSurface(payload.html);
  assert.match(payload.html, /data-controllable-entity="player\.hero"/);

  const writtenHtml = await readFile(payload.outputPath, 'utf8');
  assert.equal(writtenHtml, payload.html);
});

test('render-browser-demo with --asset-manifest preserves envelope shape and includes image loading script', () => {
  const result = runCli([
    'render-browser-demo',
    spriteScenePath,
    '--tick',
    '4',
    '--width',
    '64',
    '--height',
    '48',
    '--asset-manifest',
    validAssetManifestPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, 'sprite-fixture');
  assert.equal(payload.tick, 4);
  assertBrowserDemoHtmlWithImageLoadingSurface(payload.html);
  assert.match(payload.html, /"kind":"sprite"/);
  assert.match(payload.html, /"assetId":"player\.sprite"/);
  assert.match(payload.html, /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/);
  assert.match(payload.html, /"assetSrc":"file:\/\/\/[^"]+images\/camera-icon\.png"/);
});

test('render-browser-demo with visual.sprite and --asset-manifest includes local image loading', () => {
  const result = runCli([
    'render-browser-demo',
    visualSpriteScenePath,
    '--tick',
    '4',
    '--width',
    '64',
    '--height',
    '48',
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, 'visual-sprite-fixture');
  assert.equal(payload.tick, 4);
  assertBrowserDemoHtmlWithImageLoadingSurface(payload.html);
  assert.match(payload.html, /"kind":"sprite"/);
  assert.match(payload.html, /"assetId":"player\.sprite"/);
  assert.match(payload.html, /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/);
  assert.match(payload.html, /fillRect\(/);
});

test('render-browser-demo with --asset-manifest is deterministic for repeated runs', () => {
  const args = [
    'render-browser-demo',
    spriteScenePath,
    '--tick',
    '4',
    '--width',
    '64',
    '--height',
    '48',
    '--asset-manifest',
    validAssetManifestPath,
    '--json'
  ];

  const first = runCli(args);
  const second = runCli(args);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
});

test('render-browser-demo fails predictably when --asset-manifest path does not exist', () => {
  const result = runCli([
    'render-browser-demo',
    spriteScenePath,
    '--asset-manifest',
    invalidAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /missing\.asset-manifest\.json/);
});

test('render-browser-demo fails predictably when --asset-manifest is invalid', () => {
  const result = runCli([
    'render-browser-demo',
    spriteScenePath,
    '--asset-manifest',
    invalidRelativeAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /asset manifest is invalid:/);
});

test('render-browser-demo fails predictably when --asset-manifest src escapes manifest directory', () => {
  const result = runCli([
    'render-browser-demo',
    spriteScenePath,
    '--asset-manifest',
    invalidTraversalAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /asset manifest is invalid:/);
  assert.match(result.stderr, /\$\.assets\[0\]\.src: must stay inside the manifest directory/);
});

test('render-browser-demo --json keeps the same envelope shape when --out is omitted', () => {
  const result = runCli([
    'render-browser-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, 'tutorial');
  assert.equal(payload.tick, 4);
  assert.equal('outputPath' in payload, false);
  assertBrowserDemoHtmlSurface(payload.html);
});

test('render-browser-demo --json stays deterministic for the same scene options', () => {
  const args = [
    'render-browser-demo',
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

test('render-browser-demo --movement-blocking keeps the envelope shape and embeds local blocking data', () => {
  const result = runCli([
    'render-browser-demo',
    movementBlockingTileBlockedScenePath,
    '--movement-blocking',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, 'movement-blocking-tile-blocked-fixture');
  assert.match(payload.html, /"movementBlocking":/);
  assert.match(payload.html, /"id":"map\.walls\.tile\.0\.1"/);
  assert.match(payload.html, /function movementWouldBeBlocked\(candidateX, candidateY\)/);
});

test('render-browser-demo leaves movement blocking data out without --movement-blocking', () => {
  const result = runCli([
    'render-browser-demo',
    movementBlockingTileBlockedScenePath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'movement-blocking-tile-blocked-fixture');
  assert.doesNotMatch(payload.html, /"movementBlocking":/);
});

test('render-browser-demo leaves Browser Gameplay HUD Lite out without --gameplay-hud', () => {
  const result = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'v1-small-2d');
  assert.doesNotMatch(payload.html, /"gameplayHud":/);
  assert.doesNotMatch(payload.html, /browser-gameplay-hud/);
});

test('render-browser-demo --gameplay-hud embeds Browser Gameplay HUD Lite for the V1 small 2D scene', () => {
  const result = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--gameplay-hud',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, 'v1-small-2d');
  assert.match(payload.html, /id="browser-gameplay-hud"/);
  assert.match(payload.html, /"gameplayHud":\{"enabled":true,"movementBlockingEnabled":false,"snapshotTick":0\}/);
  assert.match(payload.html, /<dd id="browser-gameplay-hud-entity">player\.hero<\/dd>/);
  assert.match(payload.html, /<dd id="browser-gameplay-hud-movement-blocking">disabled<\/dd>/);
  assert.doesNotMatch(payload.html, /"movementBlocking":/);
});

test('render-browser-demo --gameplay-hud --movement-blocking embeds HUD and blocking metadata together', () => {
  const result = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--gameplay-hud',
    '--movement-blocking',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'v1-small-2d');
  assert.match(payload.html, /"gameplayHud":\{"enabled":true,"movementBlockingEnabled":true,"snapshotTick":0\}/);
  assert.match(payload.html, /"movementBlocking":/);
  assert.match(payload.html, /"id":"map\.ground\.tile\.2\.3"/);
  assert.match(payload.html, /id="browser-gameplay-hud-blocked-moves"/);
  assert.match(payload.html, /<dd id="browser-gameplay-hud-movement-blocking">enabled<\/dd>/);
});

test('render-browser-demo leaves Playable Save/Load Lite out without --playable-save-load', () => {
  const result = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'v1-small-2d');
  assert.doesNotMatch(payload.html, /"playableSaveLoad":/);
  assert.doesNotMatch(payload.html, /browser-playable-save-load/);
  assertNoForbiddenBrowserDemoHtmlSurface(payload.html);
});

test('render-browser-demo --playable-save-load embeds local export import controls', () => {
  const result = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--playable-save-load',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'v1-small-2d');
  assert.match(payload.html, /id="browser-playable-save-load"/);
  assert.match(payload.html, /id="browser-playable-demo-export-state"/);
  assert.match(payload.html, /id="browser-playable-demo-import-state"/);
  assert.match(
    payload.html,
    /"playableSaveLoad":\{"enabled":true,"kind":"browser\.playable-demo\.local-state","version":1\}/
  );
  assert.doesNotMatch(payload.html, /"gameplayHud":/);
  assert.doesNotMatch(payload.html, /"movementBlocking":/);
  assertNoForbiddenBrowserDemoHtmlSurface(payload.html);
});

test('render-browser-demo leaves Audio Lite out without --audio-lite', () => {
  const result = runCli([
    'render-browser-demo',
    audioLiteSfxScenePath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'audio-lite-sfx-fixture');
  assert.doesNotMatch(payload.html, /"audioLite":/);
  assert.doesNotMatch(payload.html, /browser-audio-lite/);
  assertNoForbiddenBrowserDemoHtmlSurface(payload.html);
});

test('render-browser-demo --audio-lite embeds Audio Lite metadata and controls', () => {
  const result = runCli([
    'render-browser-demo',
    audioLiteSfxScenePath,
    '--audio-lite',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'audio-lite-sfx-fixture');
  assert.match(payload.html, /id="browser-audio-lite"/);
  assert.match(payload.html, /"audioLite":\{"clips":\[/);
  assert.match(payload.html, /"clipId":"sfx\.step"/);
  assert.match(payload.html, /"trigger":"onMove"/);
  assert.match(payload.html, /"code":"AUDIO_CLIP_SRC_MISSING"/);
  assertNoForbiddenBrowserDemoHtmlSurface(payload.html);
});

test('render-browser-demo combines HUD, movement blocking, Playable Save/Load Lite and Audio Lite', () => {
  const result = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--movement-blocking',
    '--gameplay-hud',
    '--playable-save-load',
    '--audio-lite',
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: false });
  assert.equal(payload.scene, 'v1-small-2d');
  assert.match(payload.html, /id="browser-gameplay-hud"/);
  assert.match(payload.html, /id="browser-playable-save-load"/);
  assert.match(payload.html, /id="browser-audio-lite"/);
  assert.match(payload.html, /"movementBlocking":/);
  assert.match(payload.html, /"gameplayHud":\{"enabled":true,"movementBlockingEnabled":true,"snapshotTick":0\}/);
  assert.match(
    payload.html,
    /"playableSaveLoad":\{"enabled":true,"kind":"browser\.playable-demo\.local-state","version":1\}/
  );
  assert.match(payload.html, /"audioLite":\{"clips":\[\]/);
  assert.match(payload.html, /blockedMoves: blockedMoveCount/);
  assertNoForbiddenBrowserDemoHtmlSurface(payload.html);
});

test('render-browser-demo V1 small 2D only includes outputPath when --out is used', async (t) => {
  const outDir = await createTempDir(t);
  const outPath = path.join(outDir, 'v1-small-2d-browser-demo.html');
  const result = runCli([
    'render-browser-demo',
    v1Small2dScenePath,
    '--gameplay-hud',
    '--movement-blocking',
    '--out',
    outPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assertBrowserDemoEnvelopeShape(payload, { hasOutputPath: true });
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, 'v1-small-2d');
  assert.equal(payload.tick, 0);
  assert.equal(payload.outputPath, path.resolve(outPath));
  assert.match(payload.html, /id="browser-gameplay-hud"/);
  assert.match(payload.html, /"movementBlocking":/);

  const writtenHtml = await readFile(payload.outputPath, 'utf8');
  assert.equal(writtenHtml, payload.html);
});

test('render-browser-demo --movement-blocking is deterministic for blocked and open tile scenes', () => {
  const blockedArgs = [
    'render-browser-demo',
    movementBlockingTileBlockedScenePath,
    '--movement-blocking',
    '--json'
  ];
  const openArgs = [
    'render-browser-demo',
    movementBlockingTileOpenScenePath,
    '--movement-blocking',
    '--json'
  ];
  const firstBlocked = runCli(blockedArgs);
  const secondBlocked = runCli(blockedArgs);
  const open = runCli(openArgs);

  assert.equal(firstBlocked.status, 0, firstBlocked.stderr);
  assert.equal(secondBlocked.status, 0, secondBlocked.stderr);
  assert.equal(open.status, 0, open.stderr);
  assert.equal(firstBlocked.stdout, secondBlocked.stdout);

  const blockedPayload = JSON.parse(firstBlocked.stdout);
  const openPayload = JSON.parse(open.stdout);
  assert.match(blockedPayload.html, /"id":"map\.walls\.tile\.0\.1"/);
  assert.match(openPayload.html, /"id":"map\.walls\.tile\.0\.2"/);
});

test('render-browser-demo fails predictably for invalid width and height flags', () => {
  const invalidWidth = runCli([
    'render-browser-demo',
    tutorialScenePath,
    '--width',
    '0'
  ]);
  const invalidHeight = runCli([
    'render-browser-demo',
    tutorialScenePath,
    '--height',
    '0'
  ]);

  assert.notEqual(invalidWidth.status, 0);
  assert.match(invalidWidth.stderr, /buildRenderSnapshotV1: `width` must be an integer >= 1/);
  assert.notEqual(invalidHeight.status, 0);
  assert.match(invalidHeight.stderr, /buildRenderSnapshotV1: `height` must be an integer >= 1/);
});

test('render-browser-demo fails predictably when --out is present with an empty path value', () => {
  const result = runCli([
    'render-browser-demo',
    tutorialScenePath,
    '--out',
    ''
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /render-browser-demo: --out must be a non-empty string/);
});

test('render-browser-demo fails predictably when the scene path does not exist', () => {
  const result = runCli([
    'render-browser-demo',
    path.join(repoRoot, 'scenes', 'does-not-exist.scene.json')
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT: no such file or directory/);
  assert.match(result.stderr, /does-not-exist\.scene\.json/);
});

test('render-browser-demo fails predictably when visual.sprite component is invalid', () => {
  const result = runCli([
    'render-browser-demo',
    invalidVisualSpriteScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--json'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SceneValidationError: Scene validation failed for/);
  assert.match(result.stderr, /invalid_visual_sprite_asset_id\.scene\.json/);
});
