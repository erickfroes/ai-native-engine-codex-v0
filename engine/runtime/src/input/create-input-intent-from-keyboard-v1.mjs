const KEY_TO_AXIS = Object.freeze({
  ArrowRight: Object.freeze({ x: 1, y: 0 }),
  KeyD: Object.freeze({ x: 1, y: 0 }),
  ArrowLeft: Object.freeze({ x: -1, y: 0 }),
  KeyA: Object.freeze({ x: -1, y: 0 }),
  ArrowUp: Object.freeze({ x: 0, y: -1 }),
  KeyW: Object.freeze({ x: 0, y: -1 }),
  ArrowDown: Object.freeze({ x: 0, y: 1 }),
  KeyS: Object.freeze({ x: 0, y: 1 })
});

function assertValidTick(tick) {
  if (!Number.isInteger(tick) || tick < 1) {
    throw new Error('createInputIntentFromKeyboardV1: `tick` must be an integer >= 1');
  }
}

function assertValidEntityId(entityId) {
  if (typeof entityId !== 'string' || entityId.trim().length === 0) {
    throw new Error('createInputIntentFromKeyboardV1: `entityId` must be a non-empty string');
  }
}

function assertValidKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('createInputIntentFromKeyboardV1: `keys` must be a non-empty array of strings');
  }

  for (const key of keys) {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('createInputIntentFromKeyboardV1: `keys` must contain only non-empty strings');
    }
  }
}

function resolveAxis(keys) {
  const uniqueKeys = new Set(keys);
  let x = 0;
  let y = 0;

  for (const key of uniqueKeys) {
    const axis = KEY_TO_AXIS[key];
    if (!axis) {
      continue;
    }

    x += axis.x;
    y += axis.y;
  }

  return {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y))
  };
}

export function createInputIntentFromKeyboardV1({ tick, entityId, keys }) {
  assertValidTick(tick);
  assertValidEntityId(entityId);
  assertValidKeys(keys);

  return {
    inputIntentVersion: 1,
    tick,
    entityId,
    actions: [
      {
        type: 'move',
        axis: resolveAxis(keys)
      }
    ]
  };
}
