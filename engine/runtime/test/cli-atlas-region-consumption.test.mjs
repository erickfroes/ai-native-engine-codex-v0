import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'atlas-material');
const atlasScenePath = path.join(fixtureDir, 'atlas-sprite-consumption.scene.json');
const atlasManifestPath = path.join(fixtureDir, 'starter.atlas-material.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

async function createTempDir(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-region-cli-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('render-browser-demo CLI consumes atlas sprite regions only when atlas manifest is provided', () => {
  const fallback = runCli(['render-browser-demo', atlasScenePath, '--json']);
  const atlas = runCli([
    'render-browser-demo',
    atlasScenePath,
    '--atlas-material-manifest',
    atlasManifestPath,
    '--json'
  ]);

  assert.equal(fallback.status, 0, fallback.stderr);
  assert.equal(atlas.status, 0, atlas.stderr);

  const fallbackEnvelope = JSON.parse(fallback.stdout);
  const atlasEnvelope = JSON.parse(atlas.stdout);
  assert.doesNotMatch(fallbackEnvelope.html, /"atlasMaterial":/);
  assert.match(atlasEnvelope.html, /"atlasMaterial":/);
  assert.match(atlasEnvelope.html, /"atlasRegionBindingContractVersion":1/);
  assert.match(atlasEnvelope.html, /"bindingSource":"atlasBindingId"/);
  assert.match(atlasEnvelope.html, /"assetId":"atlas\.world"/);
  assert.match(atlasEnvelope.html, /drawAtlasSpriteImage/);
});

test('render-browser-demo CLI rejects atlas region consumption combined with sprite animation', () => {
  const result = runCli([
    'render-browser-demo',
    atlasScenePath,
    '--atlas-material-manifest',
    atlasManifestPath,
    '--sprite-animation',
    '--json'
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /sprite-animation cannot be combined with --atlas-material-manifest/);
});

test('render-browser-demo CLI rejects missing explicit atlasBindingId refs predictably', async (t) => {
  const tempDir = await createTempDir(t);
  const scene = JSON.parse(await readFile(atlasScenePath, 'utf8'));
  const invalidScenePath = path.join(tempDir, 'invalid-atlas-binding.scene.json');
  scene.entities = scene.entities.map((entity) =>
    entity.id === 'player.hero'
      ? {
          ...entity,
          components: entity.components.map((component) =>
            component.kind === 'visual.sprite'
              ? {
                  ...component,
                  fields: {
                    ...component.fields,
                    atlasBindingId: 'missing.hero'
                  }
                }
              : component
          )
        }
      : entity
  );
  await writeFile(invalidScenePath, JSON.stringify(scene, null, 2));

  const result = runCli([
    'render-browser-demo',
    invalidScenePath,
    '--atlas-material-manifest',
    atlasManifestPath,
    '--json'
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /atlasBindingId references unknown sprite binding `missing\.hero`/);

  const outputPath = path.join(tempDir, 'invalid-atlas-binding.html');
  const portable = runCli([
    'export-portable-html-game',
    invalidScenePath,
    '--atlas-material-manifest',
    atlasManifestPath,
    '--out',
    outputPath,
    '--json'
  ]);

  assert.equal(portable.status, 1);
  assert.match(portable.stderr, /atlasBindingId references unknown sprite binding `missing\.hero`/);
});

test('CLI rejects asset manifest combined with atlas material manifest predictably', async (t) => {
  const tempDir = await createTempDir(t);
  const outputPath = path.join(tempDir, 'conflict.html');
  const browserDemo = runCli([
    'render-browser-demo',
    atlasScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--atlas-material-manifest',
    atlasManifestPath,
    '--json'
  ]);
  const portable = runCli([
    'export-portable-html-game',
    atlasScenePath,
    '--asset-manifest',
    visualSpriteAssetManifestPath,
    '--atlas-material-manifest',
    atlasManifestPath,
    '--out',
    outputPath,
    '--json'
  ]);

  assert.equal(browserDemo.status, 1);
  assert.match(browserDemo.stderr, /provide only one of `options\.assetManifestPath` or `options\.atlasMaterialManifestPath`|provide only one of --asset-manifest or --atlas-material-manifest/);
  assert.equal(portable.status, 1);
  assert.match(portable.stderr, /provide only one of `options\.assetManifestPath` or `options\.atlasMaterialManifestPath`|provide only one of --asset-manifest or --atlas-material-manifest/);
});

test('export-portable-html-game CLI embeds atlas sprite assets as data URLs', async (t) => {
  const tempDir = await createTempDir(t);
  const outputPath = path.join(tempDir, 'atlas.html');
  const result = runCli([
    'export-portable-html-game',
    atlasScenePath,
    '--atlas-material-manifest',
    atlasManifestPath,
    '--out',
    outputPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const envelope = JSON.parse(result.stdout);
  const html = await readFile(outputPath, 'utf8');

  assert.equal(envelope.scene, 'atlas-sprite-consumption');
  assert.equal(envelope.options.assetManifest, true);
  assert.equal(envelope.embeddedAssetCount, 1);
  assert.match(html, /"atlasMaterial":/);
  assert.match(html, /"atlasRegionBindingContractVersion":1/);
  assert.match(html, /"bindingSource":"atlasBindingId"/);
  assert.match(html, /data:image\/png;base64,/);
  assert.doesNotMatch(html, /file:\/\/\//);
});
