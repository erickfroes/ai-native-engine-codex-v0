import { loadSceneFile } from '../scene/load-scene.mjs';
import { validateSceneInvariants } from '../scene/invariants.mjs';

const TILE_LAYER_COMPONENT_KIND = 'tile.layer';

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function pushSceneStructureError(errors, errorPath, message) {
  errors.push(`${errorPath}: ${message}`);
}

function validateSceneObject(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('buildTileCollisionReportV1: `sceneOrPath` must be a scene object or path string');
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
    throw new Error(`buildTileCollisionReportV1: scene object is invalid: ${errors.join('; ')}`);
  }
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    return loadSceneFile(sceneOrPath);
  }

  validateSceneObject(sceneOrPath);
  return sceneOrPath;
}

function toSolidTiles(entity) {
  const tileLayer = getComponent(entity, TILE_LAYER_COMPONENT_KIND);
  if (!tileLayer) {
    return [];
  }

  const fields = tileLayer.fields ?? {};
  const tiles = Array.isArray(fields.tiles) ? fields.tiles : [];
  const palette = fields.palette && typeof fields.palette === 'object' ? fields.palette : {};
  const solidTiles = [];

  for (const [rowIndex, row] of tiles.entries()) {
    if (!Array.isArray(row)) {
      continue;
    }

    for (const [columnIndex, tileId] of row.entries()) {
      const paletteId = String(tileId);
      const paletteEntry = palette[paletteId];
      if (!paletteEntry || paletteEntry.kind !== 'rect' || paletteEntry.solid !== true) {
        continue;
      }

      solidTiles.push({
        tileId: `${entity.id}.tile.${rowIndex}.${columnIndex}`,
        layerEntityId: entity.id,
        row: rowIndex,
        column: columnIndex,
        paletteId,
        x: columnIndex * fields.tileWidth,
        y: rowIndex * fields.tileHeight,
        width: paletteEntry.width ?? fields.tileWidth,
        height: paletteEntry.height ?? fields.tileHeight,
        solid: true
      });
    }
  }

  return solidTiles;
}

function sortTiles(left, right) {
  const entityOrder = left.layerEntityId.localeCompare(right.layerEntityId);
  if (entityOrder !== 0) {
    return entityOrder;
  }

  if (left.row !== right.row) {
    return left.row - right.row;
  }

  if (left.column !== right.column) {
    return left.column - right.column;
  }

  return left.paletteId.localeCompare(right.paletteId);
}

export async function buildTileCollisionReportV1(sceneOrPath) {
  const scene = await resolveScene(sceneOrPath);
  const tiles = (scene.entities ?? [])
    .flatMap(toSolidTiles)
    .sort(sortTiles);

  return {
    tileCollisionReportVersion: 1,
    scene: scene.metadata.name,
    tiles
  };
}
