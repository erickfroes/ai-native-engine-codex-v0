import { loadSceneFile } from '../scene/load-scene.mjs';
import { validateSceneInvariants } from '../scene/invariants.mjs';

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

function pushSceneStructureError(errors, errorPath, message) {
  errors.push(`${errorPath}: ${message}`);
}

function validateSceneObject(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('buildCollisionBoundsReportV1: `sceneOrPath` must be a scene object or path string');
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
    throw new Error(`buildCollisionBoundsReportV1: scene object is invalid: ${errors.join('; ')}`);
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
  if (left.entityId < right.entityId) {
    return -1;
  }
  if (left.entityId > right.entityId) {
    return 1;
  }
  return 0;
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
