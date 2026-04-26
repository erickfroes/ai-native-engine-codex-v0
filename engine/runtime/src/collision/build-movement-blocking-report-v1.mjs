import { loadSceneFile } from '../scene/load-scene.mjs';
import { buildCollisionBoundsReportV1 } from './build-collision-bounds-report-v1.mjs';

const TRANSFORM_COMPONENT_KIND = 'transform';

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

export async function buildMovementBlockingReportV1(sceneOrPath, options = {}) {
  assertInputIntent(options.inputIntent);

  const scene = await resolveScene(sceneOrPath);
  const entity = (scene.entities ?? []).find((candidate) => candidate?.id === options.inputIntent.entityId);

  if (!entity) {
    throw new Error(`buildMovementBlockingReportV1: entity \`${options.inputIntent.entityId}\` was not found in scene`);
  }

  const boundsReport = await buildCollisionBoundsReportV1(sceneOrPath);
  const attemptedMove = resolveAttemptedMove(options.inputIntent);
  const from = resolveTransformPosition(entity);
  const candidate = {
    x: from.x + attemptedMove.x,
    y: from.y + attemptedMove.y
  };
  const currentBound = boundsReport.bounds.find((bound) => bound.entityId === options.inputIntent.entityId);
  const candidateBound = currentBound === undefined
    ? undefined
    : {
      ...currentBound,
      x: currentBound.x + attemptedMove.x,
      y: currentBound.y + attemptedMove.y
    };

  const blockingEntities = candidateBound === undefined || candidateBound.solid !== true
    ? []
    : boundsReport.bounds
      .filter((bound) => bound.entityId !== options.inputIntent.entityId)
      .filter((bound) => bound.solid === true)
      .filter((bound) => boundsOverlap(candidateBound, bound))
      .map((bound) => bound.entityId)
      .sort();
  const blocked = blockingEntities.length > 0;

  return {
    movementBlockingReportVersion: 1,
    scene: scene.metadata.name,
    entityId: options.inputIntent.entityId,
    inputIntentTick: options.inputIntent.tick,
    attemptedMove,
    from,
    candidate,
    final: blocked ? from : candidate,
    blocked,
    blockingEntities
  };
}
