import { getKnownSystemDefinition } from '../systems/system-registry.mjs';

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

function unknownSystemHandler(context) {
  return mix(context.state, hashString(`unknown:${context.systemName}`) ^ context.tick);
}

export function resolveSystemHandler(systemName) {
  return getKnownSystemDefinition(systemName) ? knownSystemHandler : unknownSystemHandler;
}

export function runResolvedSystem(systemName, context) {
  const handler = resolveSystemHandler(systemName);
  return handler({ ...context, systemName });
}
