import path from 'node:path';

import { validateSceneFile } from './validate-scene.mjs';
import { validatePrefabFile } from '../prefab/validate-prefab.mjs';

function mergeComponents(prefabComponents, localComponents) {
  const mergedByKind = new Map();

  for (const component of prefabComponents ?? []) {
    mergedByKind.set(component.kind, component);
  }

  for (const component of localComponents ?? []) {
    mergedByKind.set(component.kind, component);
  }

  return [...mergedByKind.values()];
}

async function resolveEntityPrefab(entity, sceneAbsolutePath) {
  if (typeof entity.prefab !== 'string' || entity.prefab.length === 0) {
    return entity;
  }

  const prefabPath = path.resolve(path.dirname(sceneAbsolutePath), entity.prefab);
  const prefabReport = await validatePrefabFile(prefabPath);

  if (!prefabReport.ok) {
    const error = new Error(`Prefab validation failed for ${prefabPath}`);
    error.name = 'PrefabValidationError';
    error.entityId = entity.id;
    error.report = prefabReport;
    throw error;
  }

  return {
    ...entity,
    components: mergeComponents(prefabReport.prefab.components, entity.components)
  };
}

async function resolveScenePrefabs(scene, sceneAbsolutePath) {
  const entities = [];

  for (const entity of scene.entities ?? []) {
    entities.push(await resolveEntityPrefab(entity, sceneAbsolutePath));
  }

  return {
    ...scene,
    entities
  };
}

export async function loadSceneFile(scenePath) {
  const report = await validateSceneFile(scenePath);
  if (!report.ok) {
    const error = new Error(`Scene validation failed for ${report.absolutePath}`);
    error.name = 'SceneValidationError';
    error.report = report;
    throw error;
  }

  return resolveScenePrefabs(report.scene, report.absolutePath);
}
