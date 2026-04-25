import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { canonicalJSONStringify, createSha256Checksum } from './canonical-json.mjs';
import { validateSaveFile } from './validate-save.mjs';

const saveVersion = 1;
const saveFileName = 'state-snapshot-v1.savegame.json';
const payloadFileName = 'state-snapshot-v1.payload.json';

const rootKeys = new Set(['stateSnapshotVersion', 'scene', 'seed', 'tick', 'entities']);
const entityKeys = new Set(['id', 'name', 'components']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function appendPath(basePath, nextKey) {
  if (typeof nextKey === 'number') {
    return `${basePath}[${nextKey}]`;
  }

  return `${basePath}.${nextKey}`;
}

function pushError(errors, valuePath, message) {
  errors.push({ path: valuePath, message });
}

function validateNoUnexpectedKeys(value, allowedKeys, valuePath, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      pushError(errors, appendPath(valuePath, key), 'is not allowed by schema');
    }
  }
}

function validateStateSnapshotV1(snapshot) {
  const errors = [];

  if (!isPlainObject(snapshot)) {
    pushError(errors, '$', 'expected object');
    return errors;
  }

  validateNoUnexpectedKeys(snapshot, rootKeys, '$', errors);

  if (snapshot.stateSnapshotVersion !== 1) {
    pushError(errors, '$.stateSnapshotVersion', 'must equal 1');
  }

  if (typeof snapshot.scene !== 'string' || snapshot.scene.trim().length === 0) {
    pushError(errors, '$.scene', 'expected non-blank string');
  }

  if (!Number.isInteger(snapshot.seed)) {
    pushError(errors, '$.seed', 'expected integer');
  }

  if (!Number.isInteger(snapshot.tick)) {
    pushError(errors, '$.tick', 'expected integer');
  }

  if (!Array.isArray(snapshot.entities)) {
    pushError(errors, '$.entities', 'expected array');
    return errors;
  }

  snapshot.entities.forEach((entity, index) => {
    const entityPath = appendPath('$.entities', index);

    if (!isPlainObject(entity)) {
      pushError(errors, entityPath, 'expected object');
      return;
    }

    validateNoUnexpectedKeys(entity, entityKeys, entityPath, errors);

    if (typeof entity.id !== 'string' || entity.id.trim().length === 0) {
      pushError(errors, `${entityPath}.id`, 'expected non-blank string');
    }

    if ('name' in entity && typeof entity.name !== 'string') {
      pushError(errors, `${entityPath}.name`, 'expected string');
    }

    if (!isPlainObject(entity.components)) {
      pushError(errors, `${entityPath}.components`, 'expected object');
      return;
    }

    for (const [componentName, componentValue] of Object.entries(entity.components)) {
      if (componentName.trim().length === 0) {
        pushError(errors, `${entityPath}.components`, 'component keys must not be blank');
      }

      if (!isPlainObject(componentValue)) {
        pushError(errors, `${entityPath}.components.${componentName}`, 'expected object');
      }
    }
  });

  return errors;
}

function assertValidStateSnapshotV1(snapshot) {
  const errors = validateStateSnapshotV1(snapshot);

  if (errors.length > 0) {
    const formatted = errors.map((error) => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`invalid StateSnapshot v1: ${formatted}`);
  }
}

function assertInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer`);
  }
}

function assertPositiveInteger(value, label) {
  assertInteger(value, label);

  if (value < 1) {
    throw new RangeError(`${label} must be >= 1`);
  }
}

function resolveContainedPath(baseDir, relativeFilePath, label) {
  const resolvedBaseDir = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBaseDir, relativeFilePath);
  const relativeToBase = path.relative(resolvedBaseDir, resolvedPath);

  if (relativeToBase === '' || (!relativeToBase.startsWith('..') && !path.isAbsolute(relativeToBase))) {
    return resolvedPath;
  }

  throw new Error(`unsafe ${label}: ${relativeFilePath}`);
}

async function readJsonFile(jsonPath, label) {
  try {
    const raw = await readFile(jsonPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`failed to read ${label}: ${jsonPath}`, { cause: error });
  }
}

async function writeCanonicalJsonFile(jsonPath, value) {
  await writeFile(jsonPath, `${canonicalJSONStringify(value)}\n`, 'utf8');
}

export async function saveStateSnapshotV1({ snapshot, outDir, seed, contentVersion }) {
  assertValidStateSnapshotV1(snapshot);
  assertPositiveInteger(contentVersion, 'contentVersion');

  const effectiveSeed = seed ?? snapshot.seed;
  assertInteger(effectiveSeed, 'seed');

  if (effectiveSeed !== snapshot.seed) {
    throw new Error(`snapshot.seed (${snapshot.seed}) must match save seed (${effectiveSeed})`);
  }

  const resolvedOutDir = path.resolve(outDir);
  const payloadPath = path.join(resolvedOutDir, payloadFileName);
  const savePath = path.join(resolvedOutDir, saveFileName);
  const payloadRef = payloadFileName;

  const envelope = {
    saveVersion,
    contentVersion,
    seed: effectiveSeed,
    checksum: createSha256Checksum(snapshot),
    payloadRef
  };

  await mkdir(resolvedOutDir, { recursive: true });
  await writeCanonicalJsonFile(payloadPath, snapshot);
  await writeCanonicalJsonFile(savePath, envelope);

  return {
    savePath,
    payloadPath,
    envelope
  };
}

export async function loadStateSnapshotSaveV1(savePath) {
  const report = await validateSaveFile(savePath);

  if (!report.ok) {
    const formattedErrors = report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`invalid save file: ${formattedErrors}`);
  }

  const resolvedSavePath = report.path;
  const saveDir = path.dirname(resolvedSavePath);
  const payloadPath = resolveContainedPath(saveDir, report.save.payloadRef, 'payloadRef');
  const snapshot = await readJsonFile(payloadPath, 'state snapshot payload');

  assertValidStateSnapshotV1(snapshot);

  const computedChecksum = createSha256Checksum(snapshot);
  if (computedChecksum !== report.save.checksum) {
    throw new Error(
      `save payload checksum mismatch: expected ${report.save.checksum}, computed ${computedChecksum}`
    );
  }

  return {
    savePath: resolvedSavePath,
    payloadPath,
    envelope: report.save,
    snapshot
  };
}
