import { loadSceneFile } from '../scene/load-scene.mjs';
import { validateSceneInvariants } from '../scene/invariants.mjs';
import { buildCollisionBoundsReportV1 } from '../collision/build-collision-bounds-report-v1.mjs';
import { buildTileCollisionReportV1 } from '../collision/build-tile-collision-report-v1.mjs';

const TILE_LAYER_COMPONENT_KIND = 'tile.layer';
export const PATHFINDING_GRID_REPORT_VERSION = 1;
export const PATHFINDING_GRID_MAX_CELLS = 4096;

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function pushSceneStructureError(errors, errorPath, message) {
  errors.push(`${errorPath}: ${message}`);
}

function validateSceneObject(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('buildPathfindingGridReportV1: `sceneOrPath` must be a scene object or path string');
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
    throw new Error(`buildPathfindingGridReportV1: scene object is invalid: ${errors.join('; ')}`);
  }
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    return loadSceneFile(sceneOrPath);
  }

  validateSceneObject(sceneOrPath);
  return sceneOrPath;
}

function boundsOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function sortBlockers(left, right) {
  const idOrder = compareStrings(left.blockerId, right.blockerId);
  if (idOrder !== 0) {
    return idOrder;
  }

  return compareStrings(left.kind, right.kind);
}

function compareStrings(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function createTileBlockers(tileCollisionReport) {
  return tileCollisionReport.tiles.map((tile) => ({
    blockerId: `tile:${tile.tileId}`,
    kind: 'tile',
    layerEntityId: tile.layerEntityId,
    x: tile.x,
    y: tile.y,
    width: tile.width,
    height: tile.height,
    solid: true
  }));
}

function createCollisionBoundBlockers(collisionBoundsReport) {
  return collisionBoundsReport.bounds
    .filter((bound) => bound.solid === true)
    .map((bound) => ({
      blockerId: `collision.bounds:${bound.entityId}`,
      kind: 'collision.bounds',
      x: bound.x,
      y: bound.y,
      width: bound.width,
      height: bound.height,
      solid: true
    }));
}

function toPathfindingGrid(entity, blockers) {
  const tileLayer = getComponent(entity, TILE_LAYER_COMPONENT_KIND);
  if (!tileLayer) {
    return undefined;
  }

  const fields = tileLayer.fields ?? {};
  const cellCount = fields.columns * fields.rows;
  if (cellCount > PATHFINDING_GRID_MAX_CELLS) {
    throw new Error(
      `buildPathfindingGridReportV1: tile.layer \`${entity.id}\` has ${cellCount} cells; maximum supported by report v1 is ${PATHFINDING_GRID_MAX_CELLS}`
    );
  }

  const gridBlockers = blockers.filter(
    (blocker) => blocker.kind !== 'tile' || blocker.layerEntityId === entity.id
  );
  const blockedCells = [];

  for (let row = 0; row < fields.rows; row += 1) {
    for (let column = 0; column < fields.columns; column += 1) {
      const cell = {
        cellId: `${entity.id}.cell.${row}.${column}`,
        row,
        column,
        x: column * fields.tileWidth,
        y: row * fields.tileHeight,
        width: fields.tileWidth,
        height: fields.tileHeight
      };
      const blockerIds = gridBlockers
        .filter((blocker) => boundsOverlap(cell, blocker))
        .map((blocker) => blocker.blockerId)
        .sort(compareStrings)
        .filter((blockerId, index, values) => index === 0 || blockerId !== values[index - 1]);

      if (blockerIds.length > 0) {
        blockedCells.push({
          ...cell,
          blockerIds
        });
      }
    }
  }

  return {
    gridId: entity.id,
    layerEntityId: entity.id,
    tileWidth: fields.tileWidth,
    tileHeight: fields.tileHeight,
    columns: fields.columns,
    rows: fields.rows,
    origin: {
      x: 0,
      y: 0
    },
    cellCount,
    blockedCellCount: blockedCells.length,
    walkableCellCount: cellCount - blockedCells.length,
    blockedCells
  };
}

function sortGrids(left, right) {
  return compareStrings(left.layerEntityId, right.layerEntityId);
}

function toPublicBlocker(blocker) {
  return {
    blockerId: blocker.blockerId,
    kind: blocker.kind,
    x: blocker.x,
    y: blocker.y,
    width: blocker.width,
    height: blocker.height,
    solid: blocker.solid
  };
}

export async function buildPathfindingGridReportV1(sceneOrPath) {
  const scene = await resolveScene(sceneOrPath);
  const [tileCollisionReport, collisionBoundsReport] = await Promise.all([
    buildTileCollisionReportV1(scene),
    buildCollisionBoundsReportV1(scene)
  ]);
  const blockers = [
    ...createTileBlockers(tileCollisionReport),
    ...createCollisionBoundBlockers(collisionBoundsReport)
  ].sort(sortBlockers);
  const grids = (scene.entities ?? [])
    .map((entity) => toPathfindingGrid(entity, blockers))
    .filter(Boolean)
    .sort(sortGrids);

  return {
    pathfindingGridReportVersion: PATHFINDING_GRID_REPORT_VERSION,
    scene: scene.metadata.name,
    grids,
    blockers: blockers.map(toPublicBlocker)
  };
}
