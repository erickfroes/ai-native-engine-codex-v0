import { loadSceneFile } from '../scene/load-scene.mjs';

function cloneStable(value) {
  if (Array.isArray(value)) {
    return value.map(cloneStable);
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const cloned = {};
    for (const key of keys) {
      cloned[key] = cloneStable(value[key]);
    }
    return cloned;
  }

  return value;
}

function toEntityState(entity) {
  const componentEntries = (entity.components ?? [])
    .map((component, index) => {
      if (typeof component?.kind === 'string' && component.kind.trim().length > 0) {
        return [component.kind, component, index];
      }

      return [`__component_${index}`, component, index];
    })
    .sort((left, right) => {
      if (left[0] < right[0]) {
        return -1;
      }
      if (left[0] > right[0]) {
        return 1;
      }
      return left[2] - right[2];
    });

  const components = {};
  for (const [componentName, componentData] of componentEntries) {
    const { kind, ...componentPayload } = componentData ?? {};
    components[componentName] = cloneStable(componentPayload);
  }

  return {
    id: entity.id,
    ...(entity.name === undefined ? {} : { name: entity.name }),
    components
  };
}

export function createStateModelV1FromScene(sceneDocument, { seed } = {}) {
  return {
    stateVersion: 1,
    scene: sceneDocument.metadata.name,
    seed: seed ?? 1337,
    tick: 0,
    entities: (sceneDocument.entities ?? []).map(toEntityState),
    resources: {
      ...(sceneDocument.assetRefs === undefined ? {} : { assets: cloneStable(sceneDocument.assetRefs) }),
      metadata: cloneStable(sceneDocument.metadata)
    }
  };
}

export async function createInitialStateFromScene(scenePath, { seed } = {}) {
  const scene = await loadSceneFile(scenePath);
  return createStateModelV1FromScene(scene, { seed });
}

export function snapshotStateV1(stateModel) {
  return {
    stateSnapshotVersion: 1,
    scene: stateModel.scene,
    seed: stateModel.seed,
    tick: stateModel.tick,
    entities: cloneStable(stateModel.entities)
  };
}
