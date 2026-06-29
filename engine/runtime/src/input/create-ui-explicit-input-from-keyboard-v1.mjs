const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'KeyD', 'KeyS']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW']);
const ACTIVATE_KEYS = new Set(['Enter', 'NumpadEnter', 'Space']);

function assertValidTick(tick) {
  if (!Number.isInteger(tick) || tick < 1) {
    throw new Error('createUiExplicitInputFromKeyboardV1: `tick` must be an integer >= 1');
  }
}

function assertValidKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('createUiExplicitInputFromKeyboardV1: `keys` must be a non-empty array of strings');
  }

  for (const key of keys) {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('createUiExplicitInputFromKeyboardV1: `keys` must contain only non-empty strings');
    }
  }
}

function resolveKeyboardAction(keys) {
  const uniqueKeys = new Set(keys);
  const hasActivate = [...uniqueKeys].some((key) => ACTIVATE_KEYS.has(key));
  let directionScore = 0;

  for (const key of uniqueKeys) {
    if (NEXT_KEYS.has(key)) {
      directionScore += 1;
    } else if (PREVIOUS_KEYS.has(key)) {
      directionScore -= 1;
    }
  }

  const hasNavigation = directionScore !== 0;

  if (hasActivate && hasNavigation) {
    throw new Error('createUiExplicitInputFromKeyboardV1: `keys` must not mix activate and navigate inputs');
  }

  if (hasActivate) {
    return {
      type: 'activate'
    };
  }

  if (directionScore > 0) {
    return {
      type: 'navigate',
      direction: 'next'
    };
  }

  if (directionScore < 0) {
    return {
      type: 'navigate',
      direction: 'previous'
    };
  }

  throw new Error('createUiExplicitInputFromKeyboardV1: `keys` must resolve to navigate or activate');
}

export function createUiExplicitInputFromKeyboardV1({ tick, keys }) {
  assertValidTick(tick);
  assertValidKeys(keys);

  return {
    uiExplicitInputVersion: 1,
    tick,
    action: resolveKeyboardAction(keys)
  };
}
