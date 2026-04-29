import { stat } from 'node:fs/promises';
import path from 'node:path';

import { validateSceneFile } from '../scene/validate-scene.mjs';
import { validateSceneInvariants } from '../scene/invariants.mjs';

const AUDIO_CLIP_COMPONENT_KIND = 'audio.clip';
const AUDIO_LITE_TRIGGERS = ['onDemoStart', 'onMove', 'onBlockedMove', 'manual'];

function compareStableString(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pushSceneStructureError(errors, errorPath, message) {
  errors.push(`${errorPath}: ${message}`);
}

function validateSceneObject(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('buildAudioLiteReportV1: `sceneOrPath` must be a scene object or path string');
  }

  if (!scene.metadata || typeof scene.metadata !== 'object' || Array.isArray(scene.metadata)) {
    pushSceneStructureError(errors, '$.metadata', 'must be an object');
  } else if (typeof scene.metadata.name !== 'string' || scene.metadata.name.trim().length === 0) {
    pushSceneStructureError(errors, '$.metadata.name', 'must be a non-empty string');
  }

  if (!Array.isArray(scene.entities)) {
    pushSceneStructureError(errors, '$.entities', 'must be an array');
  } else {
    for (const [entityIndex, entity] of scene.entities.entries()) {
      const entityPath = `$.entities[${entityIndex}]`;

      if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
        pushSceneStructureError(errors, entityPath, 'must be an object');
        continue;
      }

      if (typeof entity.id !== 'string' || entity.id.trim().length === 0) {
        pushSceneStructureError(errors, `${entityPath}.id`, 'must be a non-empty string');
      }

      if (!Array.isArray(entity.components)) {
        pushSceneStructureError(errors, `${entityPath}.components`, 'must be an array');
        continue;
      }

      for (const [componentIndex, component] of entity.components.entries()) {
        const componentPath = `${entityPath}.components[${componentIndex}]`;

        if (!component || typeof component !== 'object' || Array.isArray(component)) {
          pushSceneStructureError(errors, componentPath, 'must be an object');
          continue;
        }

        if (typeof component.kind !== 'string' || component.kind.trim().length === 0) {
          pushSceneStructureError(errors, `${componentPath}.kind`, 'must be a non-empty string');
        }
      }
    }
  }

  if (errors.length === 0) {
    const invariantReport = validateSceneInvariants(scene);
    for (const error of invariantReport.errors) {
      pushSceneStructureError(errors, error.path, error.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(`buildAudioLiteReportV1: scene object is invalid: ${errors.join('; ')}`);
  }
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    const report = await validateSceneFile(sceneOrPath);
    if (!report.ok) {
      const error = new Error(`Scene validation failed for ${report.absolutePath}`);
      error.name = 'SceneValidationError';
      error.report = report;
      throw error;
    }

    return {
      scene: report.scene,
      sceneDir: path.dirname(report.absolutePath)
    };
  }

  validateSceneObject(sceneOrPath);
  return {
    scene: sceneOrPath,
    sceneDir: undefined
  };
}

function getAudioClipComponents(scene) {
  const clips = [];

  for (const entity of scene.entities ?? []) {
    for (const component of entity.components ?? []) {
      if (component?.kind !== AUDIO_CLIP_COMPONENT_KIND) {
        continue;
      }

      const fields = component.fields ?? {};
      clips.push({
        entityId: entity.id,
        clipId: fields.clipId,
        kind: fields.kind,
        trigger: fields.trigger ?? 'manual',
        volume: fields.volume ?? 1,
        loop: fields.loop === true,
        src: fields.src ?? null
      });
    }
  }

  return clips.sort((left, right) => {
    const clipOrder = compareStableString(left.clipId, right.clipId);
    return clipOrder !== 0 ? clipOrder : compareStableString(left.entityId, right.entityId);
  });
}

async function fileExists(absolutePath) {
  try {
    const stats = await stat(absolutePath);
    return stats.isFile();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function collectAudioWarnings(clips, sceneDir) {
  const warnings = [];
  const invalidRefs = [];
  const fileExistsByPath = new Map();

  for (const clip of clips) {
    if (clip.src === null) {
      warnings.push({
        code: 'AUDIO_CLIP_SRC_MISSING',
        entityId: clip.entityId,
        clipId: clip.clipId,
        message: 'audio.clip src is missing; browser playback will use silent diagnostic fallback'
      });
      continue;
    }

    if (sceneDir !== undefined) {
      const absoluteSrcPath = path.resolve(sceneDir, clip.src);
      if (!fileExistsByPath.has(absoluteSrcPath)) {
        fileExistsByPath.set(absoluteSrcPath, await fileExists(absoluteSrcPath));
      }
      if (!fileExistsByPath.get(absoluteSrcPath)) {
        const invalidRef = {
          entityId: clip.entityId,
          clipId: clip.clipId,
          src: clip.src,
          reason: 'AUDIO_CLIP_SRC_NOT_FOUND'
        };
        invalidRefs.push(invalidRef);
        warnings.push({
          code: invalidRef.reason,
          entityId: clip.entityId,
          clipId: clip.clipId,
          message: `audio.clip src was not found: ${clip.src}`
        });
      }
    }
  }

  return {
    warnings,
    invalidRefs
  };
}

function buildTriggers(clips) {
  return AUDIO_LITE_TRIGGERS
    .map((trigger) => ({
      trigger,
      clipIds: clips
      .filter((clip) => clip.trigger === trigger)
      .map((clip) => clip.clipId)
      .sort(compareStableString)
    }))
    .filter((entry) => entry.clipIds.length > 0);
}

export async function buildAudioLiteReportV1(sceneOrPath) {
  const { scene, sceneDir } = await resolveScene(sceneOrPath);
  const clips = getAudioClipComponents(scene);
  const { warnings, invalidRefs } = await collectAudioWarnings(clips, sceneDir);

  return {
    audioLiteReportVersion: 1,
    scene: scene.metadata.name,
    clips,
    triggers: buildTriggers(clips),
    warnings,
    invalidRefs
  };
}
