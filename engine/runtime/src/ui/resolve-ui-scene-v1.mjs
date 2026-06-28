import { validateSceneInvariants } from '../scene/invariants.mjs';
import { loadSceneFile } from '../scene/load-scene.mjs';

function pushSceneStructureError(errors, errorPath, message) {
  errors.push(`${errorPath}: ${message}`);
}

function assertValidUiSceneObject(scene, builderName) {
  const errors = [];

  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error(`${builderName}: \`sceneOrPath\` must be a scene object or path string`);
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
    throw new Error(`${builderName}: scene object is invalid: ${errors.join('; ')}`);
  }
}

export async function resolveUiSceneV1(sceneOrPath, builderName) {
  if (typeof sceneOrPath === 'string') {
    return {
      scene: await loadSceneFile(sceneOrPath)
    };
  }

  assertValidUiSceneObject(sceneOrPath, builderName);
  return {
    scene: sceneOrPath
  };
}
