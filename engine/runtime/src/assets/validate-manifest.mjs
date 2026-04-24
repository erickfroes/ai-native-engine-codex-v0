import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';
import { validateSceneFile } from '../scene/validate-scene.mjs';

export async function validateAssetManifestFile(manifestPath) {
  const absolutePath = path.resolve(manifestPath);
  const raw = await readFile(absolutePath, 'utf8');
  const manifest = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(manifest, registry['asset_manifest.schema.json'].schema, registry, '$', []);

  return {
    ok: errors.length === 0,
    absolutePath,
    manifest,
    errors
  };
}

export async function validateSceneAssetRefs(scenePath, manifestPath) {
  const sceneReport = await validateSceneFile(scenePath);
  const manifestReport = await validateAssetManifestFile(manifestPath);

  const errors = [];
  if (!sceneReport.ok) {
    errors.push(...sceneReport.errors.map((error) => ({ path: `scene:${error.path}`, message: error.message })));
  }

  if (!manifestReport.ok) {
    errors.push(...manifestReport.errors.map((error) => ({ path: `manifest:${error.path}`, message: error.message })));
  }

  const declaredAssets = new Set(manifestReport.manifest.assets ?? []);
  const missingAssetRefs = [];
  for (const assetRef of sceneReport.summary.assetRefs ?? []) {
    if (!declaredAssets.has(assetRef)) {
      missingAssetRefs.push(assetRef);
      errors.push({ path: '$.assetRefs', message: `asset reference missing in manifest: ${assetRef}` });
    }
  }

  return {
    ok: errors.length === 0,
    scenePath: sceneReport.absolutePath,
    manifestPath: manifestReport.absolutePath,
    missingAssetRefs,
    errors
  };
}

export function formatSceneAssetValidationReport(report) {
  const lines = [];
  lines.push(`Scene path: ${report.scenePath}`);
  lines.push(`Manifest path: ${report.manifestPath}`);
  lines.push(`Missing asset refs: ${report.missingAssetRefs.length}`);
  lines.push('');
  lines.push(report.ok ? 'Status: OK' : 'Status: INVALID');

  if (report.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      lines.push(`- ${error.path}: ${error.message}`);
    }
  }

  return lines.join('\n');
}
