import { getKnownSystemDefinition } from '../systems/system-registry.mjs';
import { resolveInputKeyboardDelta } from '../input/loop-input-intent-v1.mjs';

const TRANSFORM_COMPONENT_KIND = 'transform';
const COLLISION_BOUNDS_KIND = 'collision.bounds';

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function toInteger(value, fallback) {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function resolvePosition(entity) {
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

function resolveBounds(entity) {
  const bounds = getComponent(entity, COLLISION_BOUNDS_KIND)?.fields;
  if (!bounds || typeof bounds !== 'object') {
    return null;
  }

  return {
    x: 0,
    y: 0,
    width: toInteger(bounds.width, 0),
    height: toInteger(bounds.height, 0),
    solid: bounds.solid === undefined ? true : bounds.solid === true
  };
}

function resolveEntityBounds(entity) {
  const position = resolvePosition(entity);
  const bounds = resolveBounds(entity);
  if (bounds === null) {
    return null;
  }

  return {
    x: position.x + toInteger(bounds.x, 0),
    y: position.y + toInteger(bounds.y, 0),
    width: bounds.width,
    height: bounds.height,
    solid: bounds.solid
  };
}

function aabbOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
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

function hasMovementBlocked(scene, inputIntent, delta) {
  if (!scene || !inputIntent || !scene.entities) {
    return false;
  }

  const entity = (scene.entities ?? []).find((candidate) => candidate?.id === inputIntent.entityId);
  if (!entity) {
    throw new Error(`buildMovementBlockingReportV1: entity \`${inputIntent.entityId}\` was not found in scene`);
  }

  const source = resolveEntityBounds(entity);
  if (source === null || source.solid !== true) {
    return false;
  }

  const from = resolvePosition(entity);
  const candidate = {
    x: from.x + delta.x,
    y: from.y + delta.y,
    width: source.width,
    height: source.height,
    solid: source.solid
  };

  const blockers = (scene.entities ?? [])
    .filter((other) => other?.id !== inputIntent.entityId)
    .map((other) => ({ id: other?.id, bounds: resolveEntityBounds(other) }))
    .filter((entry) => entry.bounds?.solid === true)
    .filter((entry) => aabbOverlap(candidate, entry.bounds))
    .map((entry) => entry.id)
    .filter((id) => typeof id === 'string');

  return blockers.length > 0;
}

function mix(state, value) {
  return (Math.imul(state, 1664525) + value + 1013904223) >>> 0;
}

function hashString(value) {
  let state = 0;
  for (const char of value) {
    state = mix(state, char.codePointAt(0));
  }
  return state;
}

function knownSystemHandler(context) {
  const definition = getKnownSystemDefinition(context.systemName);
  return (context.state + definition.delta) >>> 0;
}

function inputKeyboardHandler(context) {
  const delta = resolveInputKeyboardDelta(context.inputIntent, context.tick);
  if (context.movementBlocking !== true || !context.scene || !context.inputIntent) {
    return (context.state + delta) >>> 0;
  }

  if (context.inputIntent?.tick !== context.tick) {
    return (context.state + delta) >>> 0;
  }

  const attemptedMove = resolveAttemptedMove(context.inputIntent);
  const blocked = hasMovementBlocked(context.scene, context.inputIntent, attemptedMove);
  const appliedDelta = blocked ? 0 : delta;

  return (context.state + appliedDelta) >>> 0;
}

function unknownSystemHandler(context) {
  return mix(context.state, hashString(`unknown:${context.systemName}`) ^ context.tick);
}

export function resolveSystemHandler(systemName) {
  if (systemName === 'input.keyboard') {
    return inputKeyboardHandler;
  }

  return getKnownSystemDefinition(systemName) ? knownSystemHandler : unknownSystemHandler;
}

export function runResolvedSystem(systemName, context) {
  const handler = resolveSystemHandler(systemName);
  return handler({ ...context, systemName });
}
