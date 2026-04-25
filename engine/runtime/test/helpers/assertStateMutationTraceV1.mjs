import assert from 'node:assert/strict';

export function assertStateMutationTraceV1(trace) {
  assert.equal(typeof trace, 'object');
  assert.notEqual(trace, null);

  assert.deepEqual(Object.keys(trace).sort(), [
    'mutationsByTick',
    'scene',
    'seed',
    'stateMutationTraceVersion',
    'ticks',
    'ticksExecuted'
  ]);

  assert.equal(trace.stateMutationTraceVersion, 1);
  assert.equal(typeof trace.scene, 'string');
  assert.equal(Number.isInteger(trace.ticks), true);
  assert.equal(trace.ticks >= 0, true);
  assert.equal(Number.isInteger(trace.seed), true);
  assert.equal(Number.isInteger(trace.ticksExecuted), true);
  assert.equal(trace.ticksExecuted >= 0, true);
  assert.equal(Array.isArray(trace.mutationsByTick), true);

  trace.mutationsByTick.forEach((tickEntry, index) => {
    assert.deepEqual(Object.keys(tickEntry).sort(), ['processors', 'tick']);
    assert.equal(tickEntry.tick, index + 1);
    assert.equal(Array.isArray(tickEntry.processors), true);

    tickEntry.processors.forEach((processor) => {
      assert.deepEqual(Object.keys(processor).sort(), ['mutations', 'name']);
      assert.equal(typeof processor.name, 'string');
      assert.equal(Array.isArray(processor.mutations), true);

      processor.mutations.forEach((mutation) => {
        assert.deepEqual(Object.keys(mutation).sort(), [
          'after',
          'before',
          'component',
          'entityId',
          'fieldsChanged'
        ]);
        assert.equal(typeof mutation.entityId, 'string');
        assert.equal(typeof mutation.component, 'string');
        assert.equal(typeof mutation.before, 'object');
        assert.notEqual(mutation.before, null);
        assert.equal(typeof mutation.after, 'object');
        assert.notEqual(mutation.after, null);
        assert.equal(Array.isArray(mutation.fieldsChanged), true);
        mutation.fieldsChanged.forEach((field) => {
          assert.equal(typeof field, 'string');
        });
      });
    });
  });
}
