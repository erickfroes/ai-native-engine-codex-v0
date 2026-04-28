import { getKnownSystemDefinition } from '../systems/system-registry.mjs';
import { resolveInputKeyboardDelta } from '../input/loop-input-intent-v1.mjs';
import { resolveMovementBlockingResultV1 } from '../collision/build-movement-blocking-report-v1.mjs';

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

  const blocked = resolveMovementBlockingResultV1(context.scene, context.inputIntent).blocked;
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
