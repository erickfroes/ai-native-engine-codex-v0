import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['entityId', 'keyboardInputScriptVersion', 'ticks']);
const TICK_KEYS = Object.freeze(['keys', 'tick']);

export function assertKeyboardInputScriptV1(script) {
  assert.equal(typeof script, 'object');
  assert.notEqual(script, null);
  assert.deepEqual(Object.keys(script).sort(), ROOT_KEYS);
  assert.equal(script.keyboardInputScriptVersion, 1);
  assert.equal(typeof script.entityId, 'string');
  assert.equal(script.entityId.trim().length > 0, true);
  assert.equal(Array.isArray(script.ticks), true);
  assert.equal(script.ticks.length > 0, true);

  const seenTicks = new Set();
  for (const tickEntry of script.ticks) {
    assert.equal(typeof tickEntry, 'object');
    assert.notEqual(tickEntry, null);
    assert.deepEqual(Object.keys(tickEntry).sort(), TICK_KEYS);
    assert.equal(Number.isInteger(tickEntry.tick), true);
    assert.equal(tickEntry.tick >= 1, true);
    assert.equal(Array.isArray(tickEntry.keys), true);
    assert.equal(tickEntry.keys.length > 0, true);
    assert.equal(seenTicks.has(tickEntry.tick), false);
    seenTicks.add(tickEntry.tick);

    for (const key of tickEntry.keys) {
      assert.equal(typeof key, 'string');
      assert.equal(key.trim().length > 0, true);
    }
  }
}

export function assertKeyboardInputScriptV1Rejects(script) {
  assert.throws(() => assertKeyboardInputScriptV1(script));
}
