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
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cli-render-svg-demo-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('render-svg-demo prints deterministic HTML to stdout when --out is omitted', () => {
  const first = runCli([
    'render-svg-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180'
  ]);
  const second = runCli([
    'render-svg-demo',
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
  assert.match(first.stdout, /<title>tutorial SVG Demo<\/title>/);
  assert.match(first.stdout, /<h1>tutorial SVG Demo<\/h1>/);
  assert.match(first.stdout, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

test('render-svg-demo writes HTML to --out and returns a small JSON envelope', async (t) => {
  const outDir = await createTempDir(t);
  const outPath = path.join(outDir, 'nested', 'tutorial.html');
  const result = runCli([
    'render-svg-demo',
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
  assert.deepEqual(Object.keys(payload).sort(), ['demoHtmlVersion', 'html', 'outputPath', 'scene', 'tick']);
  assert.equal(payload.demoHtmlVersion, 1);
  assert.equal(payload.scene, 'tutorial');
  assert.equal(payload.tick, 4);
  assert.equal(payload.outputPath, path.resolve(outPath));

  const writtenHtml = await readFile(payload.outputPath, 'utf8');
  assert.equal(writtenHtml, payload.html);
});
