import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../schema/mini-json-schema.mjs';

const assetsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(assetsDir, '../../../../');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'asset-manifest-v1.schema.json');
const schemaFileName = 'asset-manifest-v1.schema.json';

let cachedSchemaRegistry = null;

async function loadAssetManifestV1SchemaRegistry() {
  if (cachedSchemaRegistry) {
    return cachedSchemaRegistry;
  }

  const raw = await readFile(schemaPath, 'utf8');
  cachedSchemaRegistry = {
    [schemaFileName]: {
      fileName: schemaFileName,
      absolutePath: schemaPath,
      schema: JSON.parse(raw)
    }
  };

  return cachedSchemaRegistry;
}

function pushError(errors, valuePath, message) {
  errors.push({ path: valuePath, message });
}

function resolveContainedPath(baseDir, relativePath) {
  const resolvedBaseDir = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBaseDir, relativePath);
  const relativeToBase = path.relative(resolvedBaseDir, resolvedPath);

  if (relativeToBase === '' || (!relativeToBase.startsWith('..') && !path.isAbsolute(relativeToBase))) {
    return resolvedPath;
  }

  throw new Error(`unsafe asset src: ${relativePath}`);
}

function validateControlledFields(assetManifest, errors, manifestPath = undefined) {
  if (!Array.isArray(assetManifest?.assets)) {
    return;
  }

  const seenIds = new Set();
  const manifestDir = manifestPath ? path.dirname(manifestPath) : undefined;

  assetManifest.assets.forEach((asset, index) => {
    const assetPath = `$.assets[${index}]`;

    if (typeof asset?.id === 'string') {
      if (asset.id.trim().length === 0) {
        pushError(errors, `${assetPath}.id`, 'must not be blank');
      } else if (seenIds.has(asset.id)) {
        pushError(errors, `${assetPath}.id`, `duplicate asset id: ${asset.id}`);
      } else {
        seenIds.add(asset.id);
      }
    }

    if (typeof asset?.src === 'string') {
      if (asset.src.trim().length === 0) {
        pushError(errors, `${assetPath}.src`, 'must not be blank');
        return;
      }

      if (path.isAbsolute(asset.src)) {
        pushError(errors, `${assetPath}.src`, 'must be a relative path');
        return;
      }

      const normalizedSrc = path.normalize(asset.src);
      if (normalizedSrc.startsWith('..') || path.isAbsolute(normalizedSrc)) {
        pushError(errors, `${assetPath}.src`, 'must stay inside the manifest directory');
        return;
      }

      if (manifestDir) {
        try {
          resolveContainedPath(manifestDir, asset.src);
        } catch {
          pushError(errors, `${assetPath}.src`, 'must stay inside the manifest directory');
        }
      }
    }
  });
}

export async function validateAssetManifestV1(assetManifest, options = {}) {
  const registry = await loadAssetManifestV1SchemaRegistry();
  const errors = validateWithSchema(assetManifest, registry[schemaFileName].schema, registry, '$', []);
  validateControlledFields(assetManifest, errors, options.absolutePath);

  return {
    ok: errors.length === 0,
    assetManifest,
    errors
  };
}

export async function validateAssetManifestV1File(assetManifestPath) {
  const absolutePath = path.resolve(assetManifestPath);
  const raw = await readFile(absolutePath, 'utf8');
  const assetManifest = JSON.parse(raw);
  const report = await validateAssetManifestV1(assetManifest, { absolutePath });

  return {
    ok: report.ok,
    absolutePath,
    assetManifest,
    errors: report.errors
  };
}
