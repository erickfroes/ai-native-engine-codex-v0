const DEFAULT_INPUT_KEYBOARD_DELTA = 3;

function getMoveAxisContribution(action) {
  if (
    !action ||
    action.type !== 'move' ||
    !action.axis ||
    !Number.isInteger(action.axis.x) ||
    !Number.isInteger(action.axis.y)
  ) {
    return 0;
  }

  return action.axis.x + action.axis.y;
}

export function resolveInputKeyboardDelta(inputIntent, tick) {
  if (
    inputIntent?.inputIntentVersion !== 1 ||
    !Number.isInteger(inputIntent?.tick) ||
    inputIntent.tick !== tick ||
    !Array.isArray(inputIntent.actions)
  ) {
    return DEFAULT_INPUT_KEYBOARD_DELTA;
  }

  return inputIntent.actions.reduce((sum, action) => sum + getMoveAxisContribution(action), 0);
}
