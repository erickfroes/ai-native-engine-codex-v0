import assert from 'node:assert/strict';

const LOOP_REPORT_V1_KEYS = Object.freeze([
  'executedSystems',
  'finalState',
  'loopReportVersion',
  'scene',
  'seed',
  'ticks',
  'ticksExecuted'
]);

export function assertLoopReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.deepEqual(Object.keys(report).sort(), LOOP_REPORT_V1_KEYS);

  assert.equal(report.loopReportVersion, 1);
  assert.equal(typeof report.scene, 'string');
  assert.equal(Number.isInteger(report.ticks), true);
  assert.equal(Number.isInteger(report.seed), true);
  assert.equal(Number.isInteger(report.ticksExecuted), true);
  assert.equal(Number.isInteger(report.finalState), true);
  assert.equal(Array.isArray(report.executedSystems), true);

  for (const systemName of report.executedSystems) {
    assert.equal(typeof systemName, 'string');
  }
}

export function assertLoopReportV1Rejects(report) {
  assert.throws(() => assertLoopReportV1(report));
}
