import { createInputIntentFromKeyboardV1 } from './create-input-intent-from-keyboard-v1.mjs';

export function createKeyboardInputIntentResolverFromScriptV1(script) {
  const inputIntentByTick = new Map(
    script.ticks.map((tickEntry) => [
      tickEntry.tick,
      createInputIntentFromKeyboardV1({
        tick: tickEntry.tick,
        entityId: script.entityId,
        keys: tickEntry.keys
      })
    ])
  );

  return (tick) => inputIntentByTick.get(tick);
}
