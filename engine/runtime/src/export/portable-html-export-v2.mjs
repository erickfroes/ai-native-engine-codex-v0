import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadSceneFile } from '../scene/load-scene.mjs';
import { buildRenderSnapshotV1 } from '../render/build-render-snapshot-v1.mjs';
import {
  createBrowserPlayableDemoMetadataV1,
  renderBrowserPlayableDemoHtmlV1
} from '../render/render-browser-playable-demo-html-v1.mjs';
import { materializePortableExportAssetSrcV2 } from '../render/materialize-portable-export-asset-src-v2.mjs';
import { resolveAtlasMaterialRenderInputsV1 } from '../render/resolve-atlas-material-render-inputs-v1.mjs';
import { sha256Hex } from '../save/canonical-json.mjs';

export const PORTABLE_HTML_EXPORT_VERSION = 2;

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`exportPortableHtmlGameV2: \`${name}\` must be an object`);
  }
}

function assertNonEmptyString(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`exportPortableHtmlGameV2: \`${name}\` must be a non-empty string`);
  }
}

function normalizeExportOptions(options) {
  assertObject(options, 'options');

  for (const key of ['movementBlocking', 'gameplayHud', 'playableSaveLoad', 'audioLite', 'spriteAnimation', 'uiSystem']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') {
      throw new Error(`exportPortableHtmlGameV2: \`options.${key}\` must be a boolean when provided`);
    }
  }

  if (options.assetManifestPath !== undefined) {
    assertNonEmptyString('options.assetManifestPath', options.assetManifestPath);
  }

  if (options.atlasMaterialManifestPath !== undefined) {
    assertNonEmptyString('options.atlasMaterialManifestPath', options.atlasMaterialManifestPath);
  }

  if (options.assetManifestPath !== undefined && options.atlasMaterialManifestPath !== undefined) {
    throw new Error(
      'exportPortableHtmlGameV2: provide only one of `options.assetManifestPath` or `options.atlasMaterialManifestPath`'
    );
  }

  if (options.spriteAnimation === true && options.atlasMaterialManifestPath !== undefined) {
    throw new Error(
      'exportPortableHtmlGameV2: `options.spriteAnimation` cannot be combined with `options.atlasMaterialManifestPath` in Portable HTML Export v2'
    );
  }

  return {
    assetManifestPath: options.assetManifestPath,
    atlasMaterialManifestPath: options.atlasMaterialManifestPath,
    movementBlocking: options.movementBlocking === true,
    gameplayHud: options.gameplayHud === true,
    playableSaveLoad: options.playableSaveLoad === true,
    audioLite: options.audioLite === true,
    spriteAnimation: options.spriteAnimation === true,
    uiSystem: options.uiSystem === true
  };
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    assertNonEmptyString('sceneOrPath', sceneOrPath);
    return loadSceneFile(sceneOrPath);
  }

  assertObject(sceneOrPath, 'sceneOrPath');
  return sceneOrPath;
}

function countEmbeddedSpriteAssets(renderSnapshot) {
  return renderSnapshot.drawCalls.filter((drawCall) =>
    drawCall?.kind === 'sprite' &&
    typeof drawCall.assetSrc === 'string' &&
    drawCall.assetSrc.startsWith('data:')
  ).length;
}

export async function buildPortableHtmlGameExportV2(sceneOrPath, options = {}) {
  const scene = await resolveScene(sceneOrPath);
  const exportOptions = normalizeExportOptions(options);
  const atlasInputs = await resolveAtlasMaterialRenderInputsV1(scene, {
    assetManifestPath: exportOptions.assetManifestPath,
    atlasMaterialManifestPath: exportOptions.atlasMaterialManifestPath
  });
  const rawSnapshot = await buildRenderSnapshotV1(atlasInputs.scene, {
    assetManifestPath: atlasInputs.assetManifestPath
  });
  const snapshot = await materializePortableExportAssetSrcV2(rawSnapshot, atlasInputs.assetManifestPath);
  const metadata = createBrowserPlayableDemoMetadataV1(atlasInputs.scene, snapshot, {
    movementBlocking: exportOptions.movementBlocking,
    gameplayHud: exportOptions.gameplayHud,
    playableSaveLoad: exportOptions.playableSaveLoad,
    audioLite: exportOptions.audioLite,
    spriteAnimation: exportOptions.spriteAnimation,
    atlasMaterial: atlasInputs.atlasMaterial,
    uiSystem: exportOptions.uiSystem
  });
  const html = renderBrowserPlayableDemoHtmlV1({
    title: `${snapshot.scene} Portable HTML Game Export`,
    renderSnapshot: snapshot,
    metadata
  });
  const embeddedAssetCount = countEmbeddedSpriteAssets(snapshot);

  return {
    exportVersion: PORTABLE_HTML_EXPORT_VERSION,
    scene: snapshot.scene,
    options: {
      assetManifest: atlasInputs.assetManifestPath !== undefined,
      movementBlocking: exportOptions.movementBlocking,
      gameplayHud: exportOptions.gameplayHud,
      playableSaveLoad: exportOptions.playableSaveLoad,
      audioLite: exportOptions.audioLite,
      spriteAnimation: exportOptions.spriteAnimation,
      uiSystem: exportOptions.uiSystem
    },
    embeddedAssetCount,
    sizeBytes: Buffer.byteLength(html, 'utf8'),
    htmlHash: sha256Hex(html),
    html
  };
}

export async function exportPortableHtmlGameV2(sceneOrPath, options = {}) {
  assertObject(options, 'options');
  assertNonEmptyString('outputPath', options.outputPath);

  const outputPath = path.resolve(options.outputPath);
  const built = await buildPortableHtmlGameExportV2(sceneOrPath, options);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, built.html, 'utf8');

  return {
    exportVersion: built.exportVersion,
    scene: built.scene,
    outputPath,
    options: built.options,
    embeddedAssetCount: built.embeddedAssetCount,
    sizeBytes: built.sizeBytes,
    htmlHash: built.htmlHash
  };
}
