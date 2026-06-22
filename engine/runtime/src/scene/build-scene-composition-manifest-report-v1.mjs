import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { validateSceneFile } from './validate-scene.mjs';

export const SCENE_COMPOSITION_MANIFEST_VERSION = 1;
export const SCENE_COMPOSITION_MANIFEST_REPORT_VERSION = 1;

const TOP_LEVEL_KEYS = new Set([
  'sceneCompositionManifestVersion',
  'metadata',
  'entryScene',
  'scenes'
]);
const METADATA_KEYS = new Set(['name']);
const SCENE_REF_KEYS = new Set(['ref', 'path']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushMessage(collection, errorPath, message) {
  collection.push({ path: errorPath, message });
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`buildSceneCompositionManifestReportV1: \`${label}\` must be a non-empty string`);
  }
}

function createRootMessage(target, ref, message) {
  return {
    target,
    ref,
    path: message.path,
    message: message.message
  };
}

function summarizeScene(summary) {
  return {
    name: summary.name,
    entityCount: summary.entityCount,
    componentCount: summary.componentCount,
    replicatedComponentCount: summary.replicatedComponentCount,
    systemCount: summary.systemCount,
    assetRefCount: summary.assetRefCount,
    systems: [...summary.systems],
    assetRefs: [...summary.assetRefs]
  };
}

function normalizeSceneRefPath(scenePath) {
  return path.posix.normalize(scenePath.trim().replaceAll('\\', '/'));
}

function isSafeSceneRelativePath(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();
  return (
    !trimmed.includes('://') &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('\\') &&
    !/^[A-Za-z]:[\\/]/.test(trimmed) &&
    !trimmed.split(/[\\/]+/).includes('..')
  );
}

function isSceneDocumentPath(value) {
  return typeof value === 'string' && value.trim().replaceAll('\\', '/').endsWith('.scene.json');
}

function resolveContainedPath(baseDir, relativePath) {
  const resolvedBaseDir = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBaseDir, relativePath);
  const relativeToBase = path.relative(resolvedBaseDir, resolvedPath);

  if (relativeToBase === '' || (!relativeToBase.startsWith('..') && !path.isAbsolute(relativeToBase))) {
    return resolvedPath;
  }

  throw new Error('scene path must stay inside the manifest directory');
}

function validateUnknownKeys(value, allowedKeys, valuePath, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      pushMessage(errors, `${valuePath}.${key}`, 'is not allowed by scene composition manifest v1');
    }
  }
}

function validateManifestShape(manifest) {
  const errors = [];

  if (!isPlainObject(manifest)) {
    pushMessage(errors, '$', 'scene composition manifest must be an object');
    return errors;
  }

  validateUnknownKeys(manifest, TOP_LEVEL_KEYS, '$', errors);

  if (manifest.sceneCompositionManifestVersion !== SCENE_COMPOSITION_MANIFEST_VERSION) {
    pushMessage(errors, '$.sceneCompositionManifestVersion', 'must be 1');
  }

  if (!isPlainObject(manifest.metadata)) {
    pushMessage(errors, '$.metadata', 'metadata must be an object');
  } else {
    validateUnknownKeys(manifest.metadata, METADATA_KEYS, '$.metadata', errors);
    if (typeof manifest.metadata.name !== 'string' || manifest.metadata.name.trim().length === 0) {
      pushMessage(errors, '$.metadata.name', 'must be a non-empty string');
    }
  }

  if (typeof manifest.entryScene !== 'string' || manifest.entryScene.trim().length === 0) {
    pushMessage(errors, '$.entryScene', 'must be a non-empty scene ref');
  }

  if (!Array.isArray(manifest.scenes) || manifest.scenes.length === 0) {
    pushMessage(errors, '$.scenes', 'must contain at least one scene reference');
    return errors;
  }

  const seenRefs = new Set();
  const seenPaths = new Set();
  for (const [index, sceneRef] of manifest.scenes.entries()) {
    const sceneRefPath = `$.scenes[${index}]`;
    if (!isPlainObject(sceneRef)) {
      pushMessage(errors, sceneRefPath, 'scene reference must be an object');
      continue;
    }

    validateUnknownKeys(sceneRef, SCENE_REF_KEYS, sceneRefPath, errors);

    if (typeof sceneRef.ref !== 'string' || sceneRef.ref.trim().length === 0) {
      pushMessage(errors, `${sceneRefPath}.ref`, 'must be a non-empty string');
    } else if (seenRefs.has(sceneRef.ref)) {
      pushMessage(errors, `${sceneRefPath}.ref`, `duplicate scene ref: ${sceneRef.ref}`);
    } else {
      seenRefs.add(sceneRef.ref);
    }

    if (typeof sceneRef.path !== 'string' || sceneRef.path.trim().length === 0) {
      pushMessage(errors, `${sceneRefPath}.path`, 'must be a non-empty string');
      continue;
    }

    if (!isSafeSceneRelativePath(sceneRef.path)) {
      pushMessage(errors, `${sceneRefPath}.path`, 'must be a safe relative path');
      continue;
    }

    if (!isSceneDocumentPath(sceneRef.path)) {
      pushMessage(errors, `${sceneRefPath}.path`, 'must reference a .scene.json file');
      continue;
    }

    const normalizedPath = normalizeSceneRefPath(sceneRef.path);
    if (seenPaths.has(normalizedPath)) {
      pushMessage(errors, `${sceneRefPath}.path`, `duplicate scene path: ${normalizedPath}`);
    } else {
      seenPaths.add(normalizedPath);
    }
  }

  if (typeof manifest.entryScene === 'string' && manifest.entryScene.trim().length > 0 && !seenRefs.has(manifest.entryScene)) {
    pushMessage(errors, '$.entryScene', 'must reference a scene ref declared in scenes');
  }

  return errors;
}

async function validateSceneRef(manifestDir, sceneRef, index) {
  const refPath = `$.scenes[${index}]`;
  const ref = typeof sceneRef?.ref === 'string' && sceneRef.ref.trim().length > 0 ? sceneRef.ref : null;
  const rawPath = typeof sceneRef?.path === 'string' ? sceneRef.path : '';
  const normalizedScenePath = normalizeSceneRefPath(rawPath);

  if (!ref || !isSafeSceneRelativePath(rawPath) || !isSceneDocumentPath(rawPath)) {
    return {
      ref,
      path: rawPath,
      ok: false,
      scene: null,
      summary: null,
      errors: [
        {
          path: `${refPath}.path`,
          message: 'scene reference path is not valid'
        }
      ],
      warnings: []
    };
  }

  let absoluteScenePath;
  try {
    absoluteScenePath = resolveContainedPath(manifestDir, normalizedScenePath);
  } catch (error) {
    return {
      ref,
      path: rawPath,
      ok: false,
      scene: null,
      summary: null,
      errors: [
        {
          path: `${refPath}.path`,
          message: error.message
        }
      ],
      warnings: []
    };
  }

  try {
    const validation = await validateSceneFile(absoluteScenePath);
    return {
      ref,
      path: validation.absolutePath,
      ok: validation.ok,
      scene: validation.summary.name,
      summary: summarizeScene(validation.summary),
      errors: [...validation.errors],
      warnings: [...validation.warnings]
    };
  } catch (error) {
    return {
      ref,
      path: absoluteScenePath,
      ok: false,
      scene: null,
      summary: null,
      errors: [
        {
          path: '$',
          message: error.message
        }
      ],
      warnings: []
    };
  }
}

function createReport({
  absolutePath,
  manifest,
  entryScene,
  entryScenePath,
  scenes,
  manifestErrors
}) {
  const sceneErrors = scenes.flatMap((scene) =>
    scene.errors.map((error) => createRootMessage('scene', scene.ref, error))
  );
  const sceneWarnings = scenes.flatMap((scene) =>
    scene.warnings.map((warning) => createRootMessage('scene', scene.ref, warning))
  );
  const rootErrors = [
    ...manifestErrors.map((error) => createRootMessage('manifest', null, error)),
    ...sceneErrors
  ];

  return {
    sceneCompositionManifestReportVersion: SCENE_COMPOSITION_MANIFEST_REPORT_VERSION,
    ok: rootErrors.length === 0,
    absolutePath,
    manifest,
    entryScene,
    entryScenePath,
    scenes,
    errors: rootErrors,
    warnings: sceneWarnings
  };
}

export async function buildSceneCompositionManifestReportV1(manifestPath) {
  assertNonEmptyString(manifestPath, 'manifestPath');

  const absolutePath = path.resolve(manifestPath);
  const manifestDir = path.dirname(absolutePath);

  let raw;
  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return createReport({
        absolutePath,
        manifest: null,
        entryScene: null,
        entryScenePath: null,
        scenes: [],
        manifestErrors: [
          {
            path: '$',
            message: 'scene composition manifest file was not found'
          }
        ]
      });
    }

    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return createReport({
      absolutePath,
      manifest: null,
      entryScene: null,
      entryScenePath: null,
      scenes: [],
      manifestErrors: [
        {
          path: '$',
          message: 'scene composition manifest JSON is malformed'
        }
      ]
    });
  }

  const manifestErrors = validateManifestShape(manifest);
  const sceneRefs = isPlainObject(manifest) && Array.isArray(manifest.scenes)
    ? manifest.scenes.filter(isPlainObject)
    : [];
  const scenes = await Promise.all(
    sceneRefs.map((sceneRef, index) => validateSceneRef(manifestDir, sceneRef, index))
  );
  const entryScene = isPlainObject(manifest) && typeof manifest.entryScene === 'string' && manifest.entryScene.trim().length > 0
    ? manifest.entryScene
    : null;
  const entry = entryScene === null
    ? undefined
    : scenes.find((scene) => scene.ref === entryScene);

  return createReport({
    absolutePath,
    manifest,
    entryScene,
    entryScenePath: entry?.path ?? null,
    scenes,
    manifestErrors
  });
}
