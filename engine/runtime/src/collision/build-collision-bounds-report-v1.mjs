import { loadSceneFile } from '../scene/load-scene.mjs';

const COLLISION_BOUNDS_COMPONENT_KIND = 'collision.bounds';
const TRANSFORM_COMPONENT_KIND = 'transform';

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function toInteger(value, fallback) {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function resolveTransformPosition(transform) {
  const fields = transform?.fields ?? {};
  const position = fields.position && typeof fields.position === 'object'
    ? fields.position
    : fields;

  return {
    x: toInteger(position.x, 0),
    y: toInteger(position.y, 0)
  };
}

function validateSceneObject(scene) {
  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('buildCollisionBoundsReportV1: `sceneOrPath` must be a scene object or path string');
  }

  if (!scene.metadata || typeof scene.metadata !== 'object' || typeof scene.metadata.name !== 'string') {
    throw new Error('buildCollisionBoundsReportV1: scene object is invalid: $.metadata.name must be a string');
  }

  if (!Array.isArray(scene.entities)) {
    throw new Error('buildCollisionBoundsReportV1: scene object is invalid: $.entities must be an array');
  }
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    return loadSceneFile(sceneOrPath);
  }

  validateSceneObject(sceneOrPath);
  return sceneOrPath;
}

function toCollisionBound(entity) {
  const collisionBounds = getComponent(entity, COLLISION_BOUNDS_COMPONENT_KIND);
  if (!collisionBounds) {
    return undefined;
  }

  const transformPosition = resolveTransformPosition(getComponent(entity, TRANSFORM_COMPONENT_KIND));
  const fields = collisionBounds.fields ?? {};
  const localX = toInteger(fields.x, 0);
  const localY = toInteger(fields.y, 0);

  return {
    entityId: entity.id,
    x: transformPosition.x + localX,
    y: transformPosition.y + localY,
    width: fields.width,
    height: fields.height,
    solid: fields.solid ?? true
  };
}

function sortBounds(left, right) {
  return left.entityId.localeCompare(right.entityId);
}

export async function buildCollisionBoundsReportV1(sceneOrPath) {
  const scene = await resolveScene(sceneOrPath);
  const bounds = (scene.entities ?? [])
    .map(toCollisionBound)
    .filter(Boolean)
    .sort(sortBounds);

  return {
    collisionBoundsReportVersion: 1,
    scene: scene.metadata.name,
    bounds
  };
}
