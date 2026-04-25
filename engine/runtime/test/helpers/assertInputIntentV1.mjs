import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['actions', 'entityId', 'inputIntentVersion', 'tick']);
const ACTION_KEYS = Object.freeze(['axis', 'type']);
const AXIS_KEYS = Object.freeze(['x', 'y']);

export function assertInputIntentV1(inputIntent) {
  assert.equal(typeof inputIntent, 'object');
  assert.notEqual(inputIntent, null);

  const rootKeys = Object.keys(inputIntent).sort();
  assert.deepEqual(rootKeys, ROOT_KEYS);
  assert.equal(inputIntent.inputIntentVersion, 1);
  assert.equal(Number.isInteger(inputIntent.tick), true);
  assert.equal(inputIntent.tick >= 1, true);
  assert.equal(typeof inputIntent.entityId, 'string');
  assert.equal(inputIntent.entityId.trim().length > 0, true);

  assert.equal(Array.isArray(inputIntent.actions), true);
  assert.equal(inputIntent.actions.length > 0, true);

  for (const action of inputIntent.actions) {
    assert.equal(typeof action, 'object');
    assert.notEqual(action, null);
    assert.deepEqual(Object.keys(action).sort(), ACTION_KEYS);
    assert.equal(action.type, 'move');

    assert.equal(typeof action.axis, 'object');
    assert.notEqual(action.axis, null);
    assert.deepEqual(Object.keys(action.axis).sort(), AXIS_KEYS);

    for (const axisKey of AXIS_KEYS) {
      assert.equal(Number.isInteger(action.axis[axisKey]), true);
      assert.equal(action.axis[axisKey] >= -1, true);
      assert.equal(action.axis[axisKey] <= 1, true);
    }
  }
}

export function assertInputIntentV1Rejects(inputIntent) {
  assert.throws(() => assertInputIntentV1(inputIntent));
}
