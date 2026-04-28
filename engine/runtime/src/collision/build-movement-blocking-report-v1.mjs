import { loadSceneFile } from '../scene/load-scene.mjs';

const TRANSFORM_COMPONENT_KIND = 'transform';
const COLLISION_BOUNDS_COMPONENT_KIND = 'collision.bounds';
const TILE_LAYER_COMPONENT_KIND = 'tile.layer';

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function toInteger(value, fallback) {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function resolveTransformPosition(entity) {
  const transform = getComponent(entity, TRANSFORM_COMPONENT_KIND);
  const fields = transform?.fields ?? {};
  const position = fields.position && typeof fields.position === 'object'
    ? fields.position
    : fields;

  return {
    x: toInteger(position.x, 0),
    y: toInteger(position.y, 0)
  };
}

function resolveAttemptedMove(inputIntent) {
  return (inputIntent.actions ?? [])
    .filter((action) => action?.type === 'move')
    .reduce(
      (accumulator, action) => ({
        x: accumulator.x + toInteger(action.axis?.x, 0),
        y: accumulator.y + toInteger(action.axis?.y, 0)
      }),
      { x: 0, y: 0 }
    );
}

function boundsOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function resolveCollisionBounds(entity) {
  const bounds = getComponent(entity, COLLISION_BOUNDS_COMPONENT_KIND)?.fields;
  if (!bounds || typeof bounds !== 'object') {
    return null;
  }

  const position = resolveTransformPosition(entity);

  return {
    entityId: entity.id,
    x: position.x + toInteger(bounds.x, 0),
    y: position.y + toInteger(bounds.y, 0),
    width: toInteger(bounds.width, 0),
    height: toInteger(bounds.height, 0),
    solid: bounds.solid === undefined ? true : bounds.solid === true
  };
}

function resolveSolidTileBounds(entity) {
  const tileLayer = getComponent(entity, TILE_LAYER_COMPONENT_KIND);
  const fields = tileLayer?.fields ?? {};
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
        entityId: entity.id,
        tileId: `${entity.id}.tile.${rowIndex}.${columnIndex}`,
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

function assertInputIntent(inputIntent) {
  if (!inputIntent || typeof inputIntent !== 'object' || Array.isArray(inputIntent)) {
    throw new Error('buildMovementBlockingReportV1: `inputIntent` option is required');
  }

  if (typeof inputIntent.entityId !== 'string' || inputIntent.entityId.trim().length === 0) {
    throw new Error('buildMovementBlockingReportV1: `inputIntent.entityId` must be a non-empty string');
  }
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    return loadSceneFile(sceneOrPath);
  }

  if (!sceneOrPath || typeof sceneOrPath !== 'object' || Array.isArray(sceneOrPath)) {
    throw new Error('buildMovementBlockingReportV1: `sceneOrPath` must be a scene object or path string');
  }

  return sceneOrPath;
}

export function resolveMovementBlockingResultV1(scene, inputIntent) {
  assertInputIntent(inputIntent);

  const entity = (scene.entities ?? []).find((candidate) => candidate?.id === inputIntent.entityId);

  if (!entity) {
    throw new Error(`buildMovementBlockingReportV1: entity \`${inputIntent.entityId}\` was not found in scene`);
  }

  const attemptedMove = resolveAttemptedMove(inputIntent);
  const from = resolveTransformPosition(entity);
  const candidate = {
    x: from.x + attemptedMove.x,
    y: from.y + attemptedMove.y
  };
  const currentBound = resolveCollisionBounds(entity);
  const candidateBound = currentBound?.solid === true
    ? {
      ...currentBound,
      x: currentBound.x + attemptedMove.x,
      y: currentBound.y + attemptedMove.y
    }
    : undefined;

  const blockingEntities = candidateBound === undefined
    ? []
    : [
        ...(scene.entities ?? [])
          .map((other) => resolveCollisionBounds(other))
          .filter((bound) => bound?.entityId !== inputIntent.entityId)
          .filter((bound) => bound?.solid === true)
          .filter((bound) => boundsOverlap(candidateBound, bound))
          .map((bound) => bound.entityId),
      ...(scene.entities ?? [])
        .flatMap((other) => resolveSolidTileBounds(other))
        .filter((bound) => boundsOverlap(candidateBound, bound))
        .map((bound) => bound.tileId ?? bound.entityId)
    ]
      .filter((value) => typeof value === 'string')
      .sort()
      .filter((value, index, values) => index === 0 || value !== values[index - 1]);
  const blocked = blockingEntities.length > 0;

  return {
    entityId: inputIntent.entityId,
    inputIntentTick: inputIntent.tick,
    attemptedMove,
    from,
    candidate,
    final: blocked ? from : candidate,
    blocked,
    blockingEntities
  };
}

export async function buildMovementBlockingReportV1(sceneOrPath, options = {}) {
  const scene = await resolveScene(sceneOrPath);
  const result = resolveMovementBlockingResultV1(scene, options.inputIntent);

  return {
    movementBlockingReportVersion: 1,
    scene: scene.metadata.name,
    ...result
  };
}
