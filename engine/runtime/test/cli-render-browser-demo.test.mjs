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
  assert.match(first.stdout, /^<!DOCTYPE html>/);
  assert.match(first.stdout, /<title>tutorial Browser Playable Demo<\/title>/);
  assert.match(first.stdout, /<canvas id="browser-playable-demo-canvas"/);
  assert.match(first.stdout, /requestAnimationFrame\(renderFrame\)/);
  assert.match(first.stdout, /Pause rendering/);
  assert.match(first.stdout, /Reset/);
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
  assert.match(payload.html, /requestAnimationFrame\(renderFrame\)/);
  assert.match(payload.html, /Pause rendering/);
  assert.match(payload.html, /data-controllable-entity="player\.hero"/);

  const writtenHtml = await readFile(payload.outputPath, 'utf8');
  assert.equal(writtenHtml, payload.html);
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
  assert.match(payload.html, /^<!DOCTYPE html>/);
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
