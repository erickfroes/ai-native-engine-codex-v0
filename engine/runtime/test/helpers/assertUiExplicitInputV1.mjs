import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['action', 'tick', 'uiExplicitInputVersion']);
const NAVIGATE_ACTION_KEYS = Object.freeze(['direction', 'type']);
const ACTIVATE_ACTION_KEYS = Object.freeze(['type']);

export function assertUiExplicitInputV1(uiExplicitInput) {
  assert.equal(typeof uiExplicitInput, 'object');
  assert.notEqual(uiExplicitInput, null);
  assert.deepEqual(Object.keys(uiExplicitInput).sort(), ROOT_KEYS);
  assert.equal(uiExplicitInput.uiExplicitInputVersion, 1);
  assert.equal(Number.isInteger(uiExplicitInput.tick), true);
  assert.equal(uiExplicitInput.tick >= 1, true);

  assert.equal(typeof uiExplicitInput.action, 'object');
  assert.notEqual(uiExplicitInput.action, null);

  if (uiExplicitInput.action.type === 'navigate') {
    assert.deepEqual(Object.keys(uiExplicitInput.action).sort(), NAVIGATE_ACTION_KEYS);
    assert.ok(['previous', 'next'].includes(uiExplicitInput.action.direction));
    return;
  }

  assert.equal(uiExplicitInput.action.type, 'activate');
  assert.deepEqual(Object.keys(uiExplicitInput.action).sort(), ACTIVATE_ACTION_KEYS);
}

export function assertUiExplicitInputV1Rejects(uiExplicitInput) {
  assert.throws(() => assertUiExplicitInputV1(uiExplicitInput));
}
