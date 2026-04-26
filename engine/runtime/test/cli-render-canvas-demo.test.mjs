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
