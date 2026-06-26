import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  buildHtmlGameExportV1,
  buildPortableHtmlGameExportV2,
  buildRenderSnapshotV1,
  createBrowserPlayableDemoMetadataV1,
  loadSceneFile,
  materializeBrowserDemoAssetSrcV1,
  renderCanvas2DDemoHtmlV1,
  renderBrowserPlayableDemoHtmlV1,
  renderSnapshotToSvgV1,
  resolveAtlasMaterialRenderInputsV1
} from '../src/index.mjs';
import { assertRenderSnapshotV1 } from './helpers/assertRenderSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'atlas-material');
const atlasScenePath = path.join(fixtureDir, 'atlas-sprite-consumption.scene.json');
const atlasManifestPath = path.join(fixtureDir, 'starter.atlas-material.json');
const atlasAssetManifestPath = path.join(fixtureDir, 'atlas-material.asset-manifest.json');
const visualSpriteAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');

async function createTempDir(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'atlas-region-runtime-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

async function createAtlasManifestWithSpriteRegion(t, regionId) {
  const directory = await createTempDir(t);
  const manifest = JSON.parse(await readFile(atlasManifestPath, 'utf8'));
  manifest.sprites = manifest.sprites.map((binding) =>
    binding.id === 'player.hero'
      ? {
          ...binding,
          regionId
        }
      : binding
  );

  await copyFile(atlasAssetManifestPath, path.join(directory, 'atlas-material.asset-manifest.json'));
  const manifestPath = path.join(directory, `starter-${regionId}.atlas-material.json`);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

function createRepeatedAtlasSpriteScene(count) {
  return {
    version: 1,
    metadata: {
      name: `atlas-repeated-${count}`
    },
    systems: [
      'core.loop'
    ],
    entities: Array.from({ length: count }, (_, index) => ({
      id: `player.hero.${String(index).padStart(3, '0')}`,
      components: [
        {
          kind: 'transform',
          version: 1,
          replicated: false,
          fields: {
            position: {
              x: index % 20,
              y: Math.floor(index / 20) * 2
            }
          }
        },
        {
          kind: 'visual.sprite',
          version: 1,
          replicated: false,
          fields: {
            assetId: 'player.sprite',
            atlasBindingId: 'player.hero',
            width: 16,
            height: 16,
            layer: 1
          }
        }
      ]
    }))
  };
}

test('Atlas region consumption keeps RenderSnapshot v1 fallback unchanged without opt-in', async () => {
  const scene = await loadSceneFile(atlasScenePath);
  const snapshot = await buildRenderSnapshotV1(scene);
  const metadata = createBrowserPlayableDemoMetadataV1(scene, snapshot);
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'Atlas fallback Browser Demo',
    renderSnapshot: snapshot,
    metadata
  });

  assertRenderSnapshotV1(snapshot);
  assert.deepEqual(snapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'ground.layer.tile.0.0',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
      layer: -1
    },
    {
      kind: 'rect',
      id: 'player.hero',
      x: 10,
      y: 12,
      width: 20,
      height: 24,
      layer: 2
    }
  ]);
  assert.equal(metadata.atlasMaterial, undefined);
  assert.doesNotMatch(html, /"atlasMaterial":/);
});

test('Atlas region binding stays inert for non-atlas renderers and asset-manifest-only flows', async () => {
  const scene = await loadSceneFile(atlasScenePath);
  const rawSnapshot = await buildRenderSnapshotV1(scene, {
    assetManifestPath: visualSpriteAssetManifestPath
  });
  const snapshot = materializeBrowserDemoAssetSrcV1(rawSnapshot, visualSpriteAssetManifestPath);
  const svg = renderSnapshotToSvgV1(rawSnapshot);
  const canvasHtml = renderCanvas2DDemoHtmlV1({
    title: 'Atlas binding inert Canvas Demo',
    renderSnapshot: snapshot
  });
  const simpleExport = await buildHtmlGameExportV1(scene, {
    assetManifestPath: visualSpriteAssetManifestPath
  });

  assertRenderSnapshotV1(rawSnapshot);
  assert.equal(rawSnapshot.drawCalls[1].kind, 'sprite');
  assert.equal(rawSnapshot.drawCalls[1].assetId, 'player.sprite');
  assert.equal(rawSnapshot.drawCalls[1].assetSrc, 'images/player.png');
  assert.match(svg, /data-asset-id="player\.sprite"/);
  assert.match(canvasHtml, /"assetId":"player\.sprite"/);
  assert.doesNotMatch(canvasHtml, /"atlasMaterial":/);
  assert.match(simpleExport.html, /"assetId":"player\.sprite"/);
  assert.doesNotMatch(simpleExport.html, /"atlasMaterial":/);
});

test('Atlas region consumption resolves sprite bindings into Browser Demo crop metadata without changing snapshot shape', async () => {
  const scene = await loadSceneFile(atlasScenePath);
  const atlasInputs = await resolveAtlasMaterialRenderInputsV1(scene, {
    atlasMaterialManifestPath: atlasManifestPath
  });
  const rawSnapshot = await buildRenderSnapshotV1(atlasInputs.scene, {
    assetManifestPath: atlasInputs.assetManifestPath
  });
  const snapshot = materializeBrowserDemoAssetSrcV1(rawSnapshot, atlasInputs.assetManifestPath);
  const metadata = createBrowserPlayableDemoMetadataV1(atlasInputs.scene, snapshot, {
    atlasMaterial: atlasInputs.atlasMaterial
  });
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'Atlas Browser Demo',
    renderSnapshot: snapshot,
    metadata
  });

  assert.equal(atlasInputs.assetManifestPath, atlasAssetManifestPath);
  assertRenderSnapshotV1(rawSnapshot);
  assert.deepEqual(rawSnapshot.drawCalls, [
    {
      kind: 'rect',
      id: 'ground.layer.tile.0.0',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
      layer: -1
    },
    {
      kind: 'sprite',
      id: 'player.hero',
      assetId: 'atlas.world',
      x: 10,
      y: 12,
      width: 20,
      height: 24,
      layer: 2,
      assetSrc: 'images/atlas-world.png'
    }
  ]);
  assert.deepEqual(metadata.atlasMaterial.sprites, [
    {
      drawCallId: 'player.hero',
      entityId: 'player.hero',
      bindingId: 'player.hero',
      bindingSource: 'atlasBindingId',
      atlasId: 'world.main',
      regionId: 'player.idle',
      materialId: 'pixel.sprite',
      assetId: 'atlas.world',
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 16,
      sourceHeight: 16,
      sampler: 'nearest',
      alphaMode: 'blend'
    }
  ]);
  assert.equal(metadata.atlasMaterial.atlasRegionBindingContractVersion, 1);
  assert.equal(metadata.atlasMaterial.hashAlgorithm, 'sha256');
  assert.match(metadata.atlasMaterial.bindingHash, /^[a-f0-9]{64}$/);
  assert.match(snapshot.drawCalls[1].assetSrc, /^file:\/\/\//);
  assert.match(html, /"atlasMaterial":/);
  assert.match(html, /"atlasRegionBindingContractVersion":1/);
  assert.match(html, /"bindingSource":"atlasBindingId"/);
  assert.match(html, /drawAtlasSpriteImage/);
  assert.match(html, /spriteImageStateByAssetSrc/);
  assert.match(html, /getSpriteImageState\(drawCall\.assetSrc\)/);
  assert.match(html, /"sourceWidth":16/);

  assert.throws(
    () => createBrowserPlayableDemoMetadataV1(atlasInputs.scene, snapshot, {
      atlasMaterial: atlasInputs.atlasMaterial,
      spriteAnimation: true
    }),
    /spriteAnimation.*cannot be combined.*atlasMaterial/
  );
});

test('Atlas region consumption rejects explicit atlasBindingId refs that are missing from the atlas manifest', async () => {
  const scene = await loadSceneFile(atlasScenePath);
  const missingBindingScene = {
    ...scene,
    entities: scene.entities.map((entity) =>
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
    )
  };

  await assert.rejects(
    () => resolveAtlasMaterialRenderInputsV1(missingBindingScene, {
      atlasMaterialManifestPath: atlasManifestPath
    }),
    /atlasBindingId references unknown sprite binding `missing\.hero`/
  );
});

test('Atlas region consumption rejects asset manifests combined with atlas material manifests', async () => {
  const scene = await loadSceneFile(atlasScenePath);

  await assert.rejects(
    () => resolveAtlasMaterialRenderInputsV1(scene, {
      assetManifestPath: visualSpriteAssetManifestPath,
      atlasMaterialManifestPath: atlasManifestPath
    }),
    /provide only one of `options\.assetManifestPath` or `options\.atlasMaterialManifestPath`/
  );

  await assert.rejects(
    () => buildPortableHtmlGameExportV2(scene, {
      assetManifestPath: visualSpriteAssetManifestPath,
      atlasMaterialManifestPath: atlasManifestPath
    }),
    /provide only one of `options\.assetManifestPath` or `options\.atlasMaterialManifestPath`/
  );
});

test('Atlas region binding hash changes when the manifest region changes without changing RenderSnapshot v1 shape', async (t) => {
  const scene = await loadSceneFile(atlasScenePath);
  const alternateManifestPath = await createAtlasManifestWithSpriteRegion(t, 'tile.grass');
  const baseInputs = await resolveAtlasMaterialRenderInputsV1(scene, {
    atlasMaterialManifestPath: atlasManifestPath
  });
  const alternateInputs = await resolveAtlasMaterialRenderInputsV1(scene, {
    atlasMaterialManifestPath: alternateManifestPath
  });
  const baseSnapshot = await buildRenderSnapshotV1(baseInputs.scene, {
    assetManifestPath: baseInputs.assetManifestPath
  });
  const alternateSnapshot = await buildRenderSnapshotV1(alternateInputs.scene, {
    assetManifestPath: alternateInputs.assetManifestPath
  });

  assertRenderSnapshotV1(baseSnapshot);
  assertRenderSnapshotV1(alternateSnapshot);
  assert.equal(baseSnapshot.drawCalls[1].kind, 'sprite');
  assert.equal(alternateSnapshot.drawCalls[1].kind, 'sprite');
  assert.equal(baseSnapshot.drawCalls[1].assetId, 'atlas.world');
  assert.equal(alternateSnapshot.drawCalls[1].assetId, 'atlas.world');
  assert.equal(baseSnapshot.drawCalls[1].assetSrc, 'images/atlas-world.png');
  assert.equal(alternateSnapshot.drawCalls[1].assetSrc, 'images/atlas-world.png');
  assert.notEqual(baseInputs.atlasMaterial.bindingHash, alternateInputs.atlasMaterial.bindingHash);
  assert.equal(baseInputs.atlasMaterial.sprites[0].regionId, 'player.idle');
  assert.equal(alternateInputs.atlasMaterial.sprites[0].regionId, 'tile.grass');
  assert.equal(baseInputs.atlasMaterial.sprites[0].sourceX, 0);
  assert.equal(alternateInputs.atlasMaterial.sprites[0].sourceX, 16);
});

test('Atlas region consumption remains deterministic under repeated sprites sharing one atlas binding', async () => {
  const scene = createRepeatedAtlasSpriteScene(100);
  const first = await buildPortableHtmlGameExportV2(scene, {
    atlasMaterialManifestPath: atlasManifestPath
  });
  const second = await buildPortableHtmlGameExportV2(scene, {
    atlasMaterialManifestPath: atlasManifestPath
  });
  const dataUrlOccurrences = first.html.match(/data:image\/png;base64,/g) ?? [];

  assert.equal(first.htmlHash, second.htmlHash);
  assert.equal(first.sizeBytes, second.sizeBytes);
  assert.equal(first.embeddedAssetCount, 100);
  assert.equal(dataUrlOccurrences.length, 100);
  assert.equal(first.sizeBytes < 100000, true);
});

test('Portable HTML Export v2 embeds atlas sprite assets and keeps sprite animation composition out of scope', async () => {
  const envelope = await buildPortableHtmlGameExportV2(atlasScenePath, {
    atlasMaterialManifestPath: atlasManifestPath
  });

  assert.equal(envelope.exportVersion, 2);
  assert.equal(envelope.scene, 'atlas-sprite-consumption');
  assert.equal(envelope.options.assetManifest, true);
  assert.equal(envelope.options.spriteAnimation, false);
  assert.equal(envelope.embeddedAssetCount, 1);
  assert.match(envelope.html, /"atlasMaterial":/);
  assert.match(envelope.html, /"assetId":"atlas\.world"/);
  assert.match(envelope.html, /data:image\/png;base64,/);
  assert.doesNotMatch(envelope.html, /file:\/\/\//);

  await assert.rejects(
    () => buildPortableHtmlGameExportV2(atlasScenePath, {
      atlasMaterialManifestPath: atlasManifestPath,
      spriteAnimation: true
    }),
    /spriteAnimation.*cannot be combined.*atlasMaterialManifestPath/
  );
});
