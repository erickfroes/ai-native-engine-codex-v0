import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadSceneFile } from '../scene/load-scene.mjs';
import { buildRenderSnapshotV1 } from '../render/build-render-snapshot-v1.mjs';
import {
  createBrowserPlayableDemoMetadataV1,
  renderBrowserPlayableDemoHtmlV1
} from '../render/render-browser-playable-demo-html-v1.mjs';
import { sha256Hex } from '../save/canonical-json.mjs';

export const SIMPLE_HTML_EXPORT_VERSION = 1;

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`exportHtmlGameV1: \`${name}\` must be an object`);
  }
}

function assertNonEmptyString(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`exportHtmlGameV1: \`${name}\` must be a non-empty string`);
  }
}

function normalizeExportOptions(options) {
  assertObject(options, 'options');

  for (const key of ['movementBlocking', 'gameplayHud', 'playableSaveLoad']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') {
      throw new Error(`exportHtmlGameV1: \`options.${key}\` must be a boolean when provided`);
    }
  }

  return {
    movementBlocking: options.movementBlocking === true,
    gameplayHud: options.gameplayHud === true,
    playableSaveLoad: options.playableSaveLoad === true
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

export async function buildHtmlGameExportV1(sceneOrPath, options = {}) {
  const scene = await resolveScene(sceneOrPath);
  const exportOptions = normalizeExportOptions(options);
  const snapshot = await buildRenderSnapshotV1(scene);
  const metadata = createBrowserPlayableDemoMetadataV1(scene, snapshot, exportOptions);
  const html = renderBrowserPlayableDemoHtmlV1({
    title: `${snapshot.scene} HTML Game Export`,
    renderSnapshot: snapshot,
    metadata
  });

  return {
    exportVersion: SIMPLE_HTML_EXPORT_VERSION,
    scene: snapshot.scene,
    options: exportOptions,
    sizeBytes: Buffer.byteLength(html, 'utf8'),
    htmlHash: sha256Hex(html),
    html
  };
}

export async function exportHtmlGameV1(sceneOrPath, options = {}) {
  assertObject(options, 'options');
  assertNonEmptyString('outputPath', options.outputPath);

  const outputPath = path.resolve(options.outputPath);
  const built = await buildHtmlGameExportV1(sceneOrPath, options);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, built.html, 'utf8');

  return {
    exportVersion: built.exportVersion,
    scene: built.scene,
    outputPath,
    options: built.options,
    sizeBytes: built.sizeBytes,
    htmlHash: built.htmlHash
  };
}
