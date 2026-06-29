import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { buildAudioLiteReportV1 } from './build-audio-lite-report-v1.mjs';

export const AUDIO_EVENT_BANK_MANIFEST_VERSION = 1;
export const AUDIO_EVENT_BANK_REPORT_VERSION = 1;

const TOP_LEVEL_KEYS = new Set([
  'audioEventBankManifestVersion',
  'metadata',
  'scenePath',
  'banks'
]);
const METADATA_KEYS = new Set(['name']);
const BANK_KEYS = new Set(['bankId', 'events']);
const EVENT_KEYS = new Set(['eventId', 'clipIds']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushMessage(collection, errorPath, message) {
  collection.push({ path: errorPath, message });
}

function createRootMessage(target, ref, message) {
  return {
    target,
    ref,
    path: message.path,
    message: message.message
  };
}

function compareNullableString(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareReportMessages(left, right) {
  return (
    left.target.localeCompare(right.target) ||
    compareNullableString(left.ref, right.ref) ||
    left.path.localeCompare(right.path) ||
    left.message.localeCompare(right.message)
  );
}

function compareByKeys(...keys) {
  return (left, right) => {
    for (const key of keys) {
      const compared = compareNullableString(left[key], right[key]);
      if (compared !== 0) {
        return compared;
      }
    }

    return 0;
  };
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`buildAudioEventBankReportV1: \`${label}\` must be a non-empty string`);
  }
}

function validateUnknownKeys(value, allowedKeys, valuePath, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      pushMessage(errors, `${valuePath}.${key}`, 'is not allowed by audio event bank manifest v1');
    }
  }
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

function normalizeScenePath(scenePath) {
  return path.posix.normalize(scenePath.trim().replaceAll('\\', '/'));
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

function validateManifestShape(manifest) {
  const errors = [];

  if (!isPlainObject(manifest)) {
    pushMessage(errors, '$', 'audio event bank manifest must be an object');
    return errors;
  }

  validateUnknownKeys(manifest, TOP_LEVEL_KEYS, '$', errors);

  if (manifest.audioEventBankManifestVersion !== AUDIO_EVENT_BANK_MANIFEST_VERSION) {
    pushMessage(errors, '$.audioEventBankManifestVersion', 'must be 1');
  }

  if (!isPlainObject(manifest.metadata)) {
    pushMessage(errors, '$.metadata', 'metadata must be an object');
  } else {
    validateUnknownKeys(manifest.metadata, METADATA_KEYS, '$.metadata', errors);
    if (typeof manifest.metadata.name !== 'string' || manifest.metadata.name.trim().length === 0) {
      pushMessage(errors, '$.metadata.name', 'must be a non-empty string');
    }
  }

  if (!isSafeSceneRelativePath(manifest.scenePath)) {
    pushMessage(errors, '$.scenePath', 'must be a safe relative path');
  } else if (!isSceneDocumentPath(manifest.scenePath)) {
    pushMessage(errors, '$.scenePath', 'must reference a .scene.json file');
  }

  if (!Array.isArray(manifest.banks) || manifest.banks.length === 0) {
    pushMessage(errors, '$.banks', 'must contain at least one bank');
    return errors;
  }

  const seenBankIds = new Set();
  for (const [bankIndex, bank] of manifest.banks.entries()) {
    const bankPath = `$.banks[${bankIndex}]`;
    if (!isPlainObject(bank)) {
      pushMessage(errors, bankPath, 'bank must be an object');
      continue;
    }

    validateUnknownKeys(bank, BANK_KEYS, bankPath, errors);

    if (typeof bank.bankId !== 'string' || bank.bankId.trim().length === 0) {
      pushMessage(errors, `${bankPath}.bankId`, 'must be a non-empty string');
    } else if (seenBankIds.has(bank.bankId)) {
      pushMessage(errors, `${bankPath}.bankId`, `duplicate bankId: ${bank.bankId}`);
    } else {
      seenBankIds.add(bank.bankId);
    }

    if (!Array.isArray(bank.events) || bank.events.length === 0) {
      pushMessage(errors, `${bankPath}.events`, 'must contain at least one event');
      continue;
    }

    const seenEventIds = new Set();
    for (const [eventIndex, event] of bank.events.entries()) {
      const eventPath = `${bankPath}.events[${eventIndex}]`;
      if (!isPlainObject(event)) {
        pushMessage(errors, eventPath, 'event must be an object');
        continue;
      }

      validateUnknownKeys(event, EVENT_KEYS, eventPath, errors);

      if (typeof event.eventId !== 'string' || event.eventId.trim().length === 0) {
        pushMessage(errors, `${eventPath}.eventId`, 'must be a non-empty string');
      } else if (seenEventIds.has(event.eventId)) {
        pushMessage(errors, `${eventPath}.eventId`, `duplicate eventId in bank ${bank.bankId}: ${event.eventId}`);
      } else {
        seenEventIds.add(event.eventId);
      }

      if (!Array.isArray(event.clipIds) || event.clipIds.length === 0) {
        pushMessage(errors, `${eventPath}.clipIds`, 'must contain at least one clipId');
        continue;
      }

      const seenClipIds = new Set();
      for (const [clipIndex, clipId] of event.clipIds.entries()) {
        const clipPath = `${eventPath}.clipIds[${clipIndex}]`;
        if (typeof clipId !== 'string' || clipId.trim().length === 0) {
          pushMessage(errors, clipPath, 'must be a non-empty string');
          continue;
        }

        if (seenClipIds.has(clipId)) {
          pushMessage(errors, clipPath, `duplicate clipId in event ${event.eventId}: ${clipId}`);
          continue;
        }

        seenClipIds.add(clipId);
      }
    }
  }

  return errors;
}

async function inspectSceneAudio(manifest, manifestDir) {
  const errors = [];
  let scenePath = null;
  let sceneAbsolutePath = null;
  let sceneAudio = null;

  if (!isPlainObject(manifest)) {
    return { scenePath, sceneAbsolutePath, sceneAudio, errors };
  }

  if (!isSafeSceneRelativePath(manifest.scenePath)) {
    pushMessage(errors, '$.scenePath', 'must be a safe relative path');
    return { scenePath, sceneAbsolutePath, sceneAudio, errors };
  }

  scenePath = normalizeScenePath(manifest.scenePath);
  if (!isSceneDocumentPath(scenePath)) {
    pushMessage(errors, '$.scenePath', 'must reference a .scene.json file');
    return { scenePath, sceneAbsolutePath, sceneAudio, errors };
  }

  try {
    sceneAbsolutePath = resolveContainedPath(manifestDir, scenePath);
  } catch (error) {
    pushMessage(errors, '$.scenePath', error.message);
    return { scenePath, sceneAbsolutePath, sceneAudio, errors };
  }

  try {
    sceneAudio = await buildAudioLiteReportV1(sceneAbsolutePath);
  } catch (error) {
    pushMessage(errors, '$.scenePath', error.message);
  }

  return { scenePath, sceneAbsolutePath, sceneAudio, errors };
}

function cloneClip(clip) {
  return {
    entityId: clip.entityId,
    clipId: clip.clipId,
    kind: clip.kind,
    trigger: clip.trigger,
    volume: clip.volume,
    loop: clip.loop,
    src: clip.src
  };
}

function buildBanks(manifest, sceneAudio) {
  const errors = [];
  const warnings = [];
  const referencedClipIds = new Set();

  if (!isPlainObject(manifest) || !Array.isArray(manifest.banks) || !sceneAudio) {
    return { banks: [], errors, warnings, referencedClipIds };
  }

  const clipById = new Map(sceneAudio.clips.map((clip) => [clip.clipId, clip]));
  const banks = [];

  for (const [bankIndex, bank] of manifest.banks.entries()) {
    if (!isPlainObject(bank) || typeof bank.bankId !== 'string' || !Array.isArray(bank.events)) {
      continue;
    }

    const events = [];
    for (const [eventIndex, event] of bank.events.entries()) {
      if (!isPlainObject(event) || typeof event.eventId !== 'string' || !Array.isArray(event.clipIds)) {
        continue;
      }

      const clips = [];
      const clipIds = [];
      for (const [clipIndex, clipId] of event.clipIds.entries()) {
        if (typeof clipId !== 'string' || clipId.trim().length === 0) {
          continue;
        }

        clipIds.push(clipId);
        const clip = clipById.get(clipId);
        if (!clip) {
          errors.push({
            target: 'event',
            ref: `${bank.bankId}#${event.eventId}`,
            path: `$.banks[${bankIndex}].events[${eventIndex}].clipIds[${clipIndex}]`,
            message: `referenced scene clipId not found: ${clipId}`
          });
          continue;
        }

        referencedClipIds.add(clipId);
        clips.push(cloneClip(clip));
      }

      events.push({
        eventId: event.eventId,
        clipIds: [...clipIds].sort((left, right) => left.localeCompare(right)),
        clips: [...clips].sort(compareByKeys('clipId', 'entityId'))
      });
    }

    banks.push({
      bankId: bank.bankId,
      eventCount: events.length,
      events: [...events].sort(compareByKeys('eventId'))
    });
  }

  for (const clip of sceneAudio.clips) {
    if (!referencedClipIds.has(clip.clipId)) {
      warnings.push({
        target: 'sceneClip',
        ref: clip.clipId,
        path: '$.banks',
        message: 'scene audio clip is not referenced by any event bank'
      });
    }
  }

  return {
    banks: [...banks].sort(compareByKeys('bankId')),
    errors,
    warnings: warnings.sort(compareReportMessages),
    referencedClipIds
  };
}

function createSummary(sceneAudio, banks, referencedClipIds) {
  const eventCount = banks.reduce((sum, bank) => sum + bank.events.length, 0);
  const unreferencedClipCount = sceneAudio
    ? sceneAudio.clips.filter((clip) => !referencedClipIds.has(clip.clipId)).length
    : 0;

  return {
    bankCount: banks.length,
    eventCount,
    sceneClipCount: sceneAudio?.clips.length ?? 0,
    referencedClipCount: referencedClipIds.size,
    unreferencedClipCount
  };
}

function createReport({
  absolutePath,
  sceneAbsolutePath,
  manifest,
  sceneAudio,
  banks,
  manifestErrors,
  sceneErrors,
  bankErrors,
  bankWarnings,
  referencedClipIds
}) {
  const errors = [
    ...manifestErrors.map((error) => createRootMessage('manifest', null, error)),
    ...sceneErrors.map((error) => createRootMessage('scene', null, error)),
    ...bankErrors
  ].sort(compareReportMessages);
  const warnings = [
    ...(sceneAudio?.warnings ?? []).map((warning) => ({
      target: 'sceneClip',
      ref: warning.clipId ?? warning.entityId ?? null,
      path: '$.sceneAudio.clips[]',
      message: warning.message
    })),
    ...bankWarnings
  ].sort(compareReportMessages);

  return {
    audioEventBankReportVersion: AUDIO_EVENT_BANK_REPORT_VERSION,
    ok: errors.length === 0,
    absolutePath,
    sceneAbsolutePath,
    scene: sceneAudio?.scene ?? null,
    manifest,
    summary: createSummary(sceneAudio, banks, referencedClipIds),
    sceneAudio: sceneAudio === null
      ? null
      : {
          clips: sceneAudio.clips.map(cloneClip),
          warnings: [...sceneAudio.warnings],
          invalidRefs: [...sceneAudio.invalidRefs]
        },
    banks,
    errors,
    warnings
  };
}

export async function buildAudioEventBankReportV1(manifestPath) {
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
        sceneAbsolutePath: null,
        manifest: null,
        sceneAudio: null,
        banks: [],
        manifestErrors: [
          {
            path: '$',
            message: 'audio event bank manifest file was not found'
          }
        ],
        sceneErrors: [],
        bankErrors: [],
        bankWarnings: [],
        referencedClipIds: new Set()
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
      sceneAbsolutePath: null,
      manifest: null,
      sceneAudio: null,
      banks: [],
      manifestErrors: [
        {
          path: '$',
          message: 'audio event bank manifest JSON is malformed'
        }
      ],
      sceneErrors: [],
      bankErrors: [],
      bankWarnings: [],
      referencedClipIds: new Set()
    });
  }

  const manifestErrors = validateManifestShape(manifest);
  const {
    sceneAbsolutePath,
    sceneAudio,
    errors: sceneErrors
  } = await inspectSceneAudio(manifest, manifestDir);
  const {
    banks,
    errors: bankErrors,
    warnings: bankWarnings,
    referencedClipIds
  } = buildBanks(manifest, sceneAudio);

  return createReport({
    absolutePath,
    sceneAbsolutePath,
    manifest,
    sceneAudio,
    banks,
    manifestErrors,
    sceneErrors,
    bankErrors,
    bankWarnings,
    referencedClipIds
  });
}
