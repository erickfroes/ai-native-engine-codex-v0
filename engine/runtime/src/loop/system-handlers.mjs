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

function coreLoopHandler(context) {
  return (context.state + 1) >>> 0;
}

function keyboardStubHandler(context) {
  return mix(context.state, context.seed);
}

function replicationStubHandler(context) {
  return mix(context.state, context.tick ^ context.seed);
}

const KNOWN_SYSTEM_HANDLERS = Object.freeze({
  'core.loop': coreLoopHandler,
  'input.keyboard': keyboardStubHandler,
  'networking.replication': replicationStubHandler
});

function unknownSystemHandler(context) {
  return mix(context.state, hashString(`unknown:${context.systemName}`) ^ context.tick);
}

export function resolveSystemHandler(systemName) {
  return KNOWN_SYSTEM_HANDLERS[systemName] ?? unknownSystemHandler;
}

export function runResolvedSystem(systemName, context) {
  const handler = resolveSystemHandler(systemName);
  return handler({ ...context, systemName });
}
