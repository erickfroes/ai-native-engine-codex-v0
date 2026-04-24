import assert from 'node:assert/strict';

const TRACE_KEYS = Object.freeze([
  'scene',
  'seed',
  'systemsPerTick',
  'ticks',
  'ticksExecuted',
  'traceVersion'
]);

const TICK_KEYS = Object.freeze(['systems', 'tick']);
const SYSTEM_KEYS = Object.freeze(['delta', 'name', 'stateAfter', 'stateBefore']);

export function assertLoopTraceV1(trace) {
  assert.equal(typeof trace, 'object');
  assert.notEqual(trace, null);
  assert.deepEqual(Object.keys(trace).sort(), TRACE_KEYS);

  assert.equal(trace.traceVersion, 1);
  assert.equal(typeof trace.scene, 'string');
  assert.equal(Number.isInteger(trace.ticks), true);
  assert.equal(Number.isInteger(trace.seed), true);
  assert.equal(Number.isInteger(trace.ticksExecuted), true);
  assert.equal(Array.isArray(trace.systemsPerTick), true);

  for (const tick of trace.systemsPerTick) {
    assert.equal(typeof tick, 'object');
    assert.notEqual(tick, null);
    assert.deepEqual(Object.keys(tick).sort(), TICK_KEYS);
    assert.equal(Number.isInteger(tick.tick), true);
    assert.equal(Array.isArray(tick.systems), true);

    for (const system of tick.systems) {
      assert.equal(typeof system, 'object');
      assert.notEqual(system, null);
      assert.deepEqual(Object.keys(system).sort(), SYSTEM_KEYS);
      assert.equal(typeof system.name, 'string');
      assert.equal(Number.isInteger(system.delta), true);
      assert.equal(Number.isInteger(system.stateBefore), true);
      assert.equal(Number.isInteger(system.stateAfter), true);
    }
  }
}
