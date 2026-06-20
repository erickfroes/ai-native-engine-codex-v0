import { validateSceneFile } from '../scene/validate-scene.mjs';
import { validateSceneInvariants } from '../scene/invariants.mjs';

const KIND = 'visual.sprite.animation';

function compareStableString(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pushSceneStructureError(errors, errorPath, message) {
  errors.push(`${errorPath}: ${message}`);
}

function validateSceneObject(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('buildSpriteAnimationReportV1: `sceneOrPath` must be a scene object or path string');
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
    throw new Error(`buildSpriteAnimationReportV1: scene object is invalid: ${errors.join('; ')}`);
  }
}

function validateFrame(frame, index, context) {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
    throw new Error(`buildSpriteAnimationReportV1: ${context}.frames[${index}] must be an object`);
  }
  if (!Number.isInteger(frame.x) || frame.x < 0 || !Number.isInteger(frame.y) || frame.y < 0) {
    throw new Error(`buildSpriteAnimationReportV1: ${context}.frames[${index}] must contain integer x/y >= 0`);
  }
  return { x: frame.x, y: frame.y, index };
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

    return { scene: report.scene };
  }

  validateSceneObject(sceneOrPath);
  return { scene: sceneOrPath };
}

export async function buildSpriteAnimationReportV1(sceneOrPath) {
  const { scene } = await resolveScene(sceneOrPath);
  const animations = [];
  const warnings = [];
  const invalidRefs = [];
  const spriteAssetIds = new Set();

  for (const entity of scene.entities ?? []) {
    for (const component of entity.components ?? []) {
      if (component?.kind === 'visual.sprite' && typeof component.fields?.assetId === 'string') {
        spriteAssetIds.add(component.fields.assetId);
      }
    }
  }

  for (const entity of scene.entities ?? []) {
    for (const component of entity.components ?? []) {
      if (component?.kind !== KIND) continue;
      const fields = component.fields ?? {};
      const context = `entity(${entity.id}).visual.sprite.animation(${fields.animationId ?? 'unknown'})`;
      const normalized = {
        entityId: entity.id,
        animationId: fields.animationId,
        assetId: fields.assetId,
        frameWidth: fields.frameWidth,
        frameHeight: fields.frameHeight,
        fps: fields.fps,
        loop: fields.loop !== false,
        state: typeof fields.state === 'string' && fields.state.trim().length > 0 ? fields.state : 'default',
        frames: (fields.frames ?? []).map((frame, index) => validateFrame(frame, index, context))
      };

      if (!spriteAssetIds.has(normalized.assetId)) {
        const reason = 'SPRITE_ANIMATION_ASSET_NOT_IN_VISUAL_SPRITE';
        invalidRefs.push({ entityId: entity.id, animationId: normalized.animationId, assetId: normalized.assetId, reason });
        warnings.push({ code: reason, entityId: entity.id, animationId: normalized.animationId, message: `assetId not referenced by visual.sprite: ${normalized.assetId}` });
      }

      animations.push(normalized);
    }
  }

  animations.sort((a, b) => compareStableString(a.animationId, b.animationId) || compareStableString(a.entityId, b.entityId));

  return {
    spriteAnimationReportVersion: 1,
    scene: scene.metadata.name,
    animations,
    warnings,
    invalidRefs
  };
}
