import { readFile } from 'node:fs/promises';
import path from 'node:path';

const KIND = 'visual.sprite.animation';

function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

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
    const absolutePath = path.resolve(sceneOrPath);
    const raw = await readFile(absolutePath, 'utf8');
    return { scene: JSON.parse(raw), scenePath: absolutePath };
  }
  if (!sceneOrPath || typeof sceneOrPath !== 'object' || Array.isArray(sceneOrPath)) {
    throw new Error('buildSpriteAnimationReportV1: `sceneOrPath` must be a scene object or path string');
  }
  return { scene: sceneOrPath, scenePath: null };
}

export async function buildSpriteAnimationReportV1(sceneOrPath) {
  const { scene, scenePath } = await resolveScene(sceneOrPath);
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

  animations.sort((a, b) => cmp(a.animationId, b.animationId) || cmp(a.entityId, b.entityId));

  return {
    spriteAnimationReportVersion: 1,
    scene: scene.metadata?.name ?? null,
    scenePath,
    animations,
    warnings,
    invalidRefs
  };
}
