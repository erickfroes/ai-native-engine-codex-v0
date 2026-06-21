import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

function compareStableString(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushMessage(collection, errorPath, message) {
  collection.push({ path: errorPath, message });
}

export function isSafePrefabRelativePath(value) {
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

export function isPrefabDocumentPath(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  return value.trim().replaceAll('\\', '/').endsWith('.prefab.json');
}

function validatePrefabInvariants(prefab) {
  const errors = [];

  if (!Array.isArray(prefab?.components) || prefab.components.length === 0) {
    pushMessage(errors, '$.components', 'prefab must contain at least one component');
    return errors;
  }

  const seenKinds = new Set();
  for (const [componentIndex, component] of prefab.components.entries()) {
    if (!component || typeof component !== 'object' || Array.isArray(component)) {
      continue;
    }

    if (typeof component.kind !== 'string' || component.kind.trim().length === 0) {
      continue;
    }

    if (seenKinds.has(component.kind)) {
      pushMessage(
        errors,
        `$.components[${componentIndex}].kind`,
        `duplicate component kind in prefab: ${component.kind}`
      );
      continue;
    }

    seenKinds.add(component.kind);
  }

  return errors;
}

function formatPrefabErrors(errors) {
  return errors
    .map((error) => (error.path === '$' ? error.message : `${error.path}: ${error.message}`))
    .join('; ');
}

function sortOverridesV2(overrides) {
  overrides.sort(
    (left, right) =>
      compareStableString(left.kind, right.kind) ||
      compareStableString(left.entityComponentPath, right.entityComponentPath) ||
      compareStableString(left.prefabComponentPath, right.prefabComponentPath)
  );
}

function mergePrefabComponents(prefabComponents, entityComponents, entityIndex) {
  const mergedComponents = [];
  const componentOrigins = [];
  const componentOriginsV2 = [];
  const overriddenComponents = [];
  const overrides = [];
  const entityByKind = new Map(
    (entityComponents ?? [])
      .filter((component) => component && typeof component === 'object' && !Array.isArray(component))
      .map((component, componentIndex) => [
        component.kind,
        {
          component: cloneJson(component),
          sourceComponentPath: `$.entities[${entityIndex}].components[${componentIndex}]`
        }
      ])
  );
  const prefabKinds = new Set();
  let resolvedComponentIndex = 0;

  for (const [componentIndex, component] of (prefabComponents ?? []).entries()) {
    const prefabComponentPath = `$.components[${componentIndex}]`;
    const resolvedComponentPath = `$.entities[${entityIndex}].components[${resolvedComponentIndex}]`;
    prefabKinds.add(component.kind);

    if (entityByKind.has(component.kind)) {
      const entityOverride = entityByKind.get(component.kind);
      mergedComponents.push(entityOverride.component);
      componentOrigins.push({
        kind: component.kind,
        source: 'entity'
      });
      componentOriginsV2.push({
        kind: component.kind,
        source: 'entity',
        sourceComponentPath: entityOverride.sourceComponentPath,
        resolvedComponentPath
      });
      overriddenComponents.push(component.kind);
      overrides.push({
        kind: component.kind,
        entityComponentPath: entityOverride.sourceComponentPath,
        prefabComponentPath,
        resolvedComponentPath
      });
      entityByKind.delete(component.kind);
      resolvedComponentIndex += 1;
      continue;
    }

    mergedComponents.push(cloneJson(component));
    componentOrigins.push({
      kind: component.kind,
      source: 'prefab'
    });
    componentOriginsV2.push({
      kind: component.kind,
      source: 'prefab',
      sourceComponentPath: prefabComponentPath,
      resolvedComponentPath
    });
    resolvedComponentIndex += 1;
  }

  for (const [componentIndex, component] of (entityComponents ?? []).entries()) {
    if (prefabKinds.has(component.kind)) {
      continue;
    }

    const sourceComponentPath = `$.entities[${entityIndex}].components[${componentIndex}]`;
    const resolvedComponentPath = `$.entities[${entityIndex}].components[${resolvedComponentIndex}]`;
    mergedComponents.push(cloneJson(component));
    componentOrigins.push({
      kind: component.kind,
      source: 'entity'
    });
    componentOriginsV2.push({
      kind: component.kind,
      source: 'entity',
      sourceComponentPath,
      resolvedComponentPath
    });
    resolvedComponentIndex += 1;
  }

  overriddenComponents.sort(compareStableString);
  sortOverridesV2(overrides);

  return {
    mergedComponents,
    componentOrigins,
    componentOriginsV2,
    overriddenComponents,
    overrides
  };
}

export async function validatePrefabFileV1(prefabPath) {
  const absolutePath = path.resolve(prefabPath);

  let raw;
  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        ok: false,
        absolutePath,
        prefab: null,
        errors: [
          {
            path: '$',
            message: 'prefab file was not found'
          }
        ]
      };
    }

    throw error;
  }

  let prefab;
  try {
    prefab = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      absolutePath,
      prefab: null,
      errors: [
        {
          path: '$',
          message: 'prefab JSON is malformed'
        }
      ]
    };
  }

  const registry = await loadSchemaRegistry();
  const shapeErrors = validateWithSchema(prefab, registry['prefab.schema.json'].schema, registry, '$', []);
  const invariantErrors = validatePrefabInvariants(prefab);
  const errors = [...shapeErrors, ...invariantErrors];

  return {
    ok: errors.length === 0,
    absolutePath,
    prefab,
    errors
  };
}

export async function resolveScenePrefabsV1(scene, scenePath) {
  const absoluteScenePath = path.resolve(scenePath);
  const sceneDir = path.dirname(absoluteScenePath);
  const resolvedScene = cloneJson(scene);
  const errors = [];
  const prefabUsage = [];
  const prefabUsageV2 = [];
  const prefabCache = new Map();

  resolvedScene.entities = [];

  for (const [entityIndex, entity] of (scene.entities ?? []).entries()) {
    const prefabRef = entity?.prefab;

    if (prefabRef === undefined) {
      resolvedScene.entities.push(cloneJson(entity));
      continue;
    }

    const prefabPathErrorPath = `$.entities[${entityIndex}].prefab`;
    if (!isSafePrefabRelativePath(prefabRef)) {
      pushMessage(errors, prefabPathErrorPath, 'prefab must be a safe relative path');
      resolvedScene.entities.push(cloneJson(entity));
      continue;
    }

    if (!isPrefabDocumentPath(prefabRef)) {
      pushMessage(errors, prefabPathErrorPath, 'prefab must reference a .prefab.json file');
      resolvedScene.entities.push(cloneJson(entity));
      continue;
    }

    const normalizedPrefabRef = prefabRef.trim().replaceAll('\\', '/');
    const absolutePrefabPath = path.resolve(sceneDir, normalizedPrefabRef);

    if (!prefabCache.has(absolutePrefabPath)) {
      prefabCache.set(absolutePrefabPath, await validatePrefabFileV1(absolutePrefabPath));
    }

    const prefabReport = prefabCache.get(absolutePrefabPath);
    if (!prefabReport.ok) {
      pushMessage(
        errors,
        prefabPathErrorPath,
        `prefab \`${normalizedPrefabRef}\` is invalid: ${formatPrefabErrors(prefabReport.errors)}`
      );
      resolvedScene.entities.push(cloneJson(entity));
      continue;
    }

    const { mergedComponents, componentOrigins, componentOriginsV2, overriddenComponents, overrides } = mergePrefabComponents(
      prefabReport.prefab.components,
      entity.components ?? [],
      entityIndex
    );
    const resolvedEntity = cloneJson(entity);
    resolvedEntity.prefab = normalizedPrefabRef;
    resolvedEntity.components = mergedComponents;
    resolvedScene.entities.push(resolvedEntity);
    const entityPath = `$.entities[${entityIndex}]`;
    prefabUsage.push({
      entityId: entity.id,
      prefab: normalizedPrefabRef,
      prefabName: prefabReport.prefab.metadata.name,
      prefabVersion: prefabReport.prefab.prefabVersion,
      components: componentOrigins,
      overriddenComponents
    });
    prefabUsageV2.push({
      entityId: entity.id,
      entityPath,
      prefab: normalizedPrefabRef,
      prefabAbsolutePath: absolutePrefabPath,
      prefabName: prefabReport.prefab.metadata.name,
      prefabVersion: prefabReport.prefab.prefabVersion,
      components: componentOriginsV2,
      overriddenComponents,
      overrides
    });
  }

  prefabUsage.sort(
    (left, right) =>
      compareStableString(left.entityId, right.entityId) || compareStableString(left.prefab, right.prefab)
  );
  prefabUsageV2.sort(
    (left, right) =>
      compareStableString(left.entityId, right.entityId) || compareStableString(left.prefab, right.prefab)
  );

  return {
    scene: resolvedScene,
    errors,
    prefabUsage,
    prefabUsageV2
  };
}
