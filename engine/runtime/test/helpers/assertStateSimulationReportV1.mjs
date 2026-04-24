import assert from 'node:assert/strict';

import { assertStateSnapshotV1 } from './assertStateSnapshotV1.mjs';

export function assertStateSimulationReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.equal(report.stateSimulationReportVersion, 1);
  assert.equal(typeof report.scene, 'string');
  assert.equal(Number.isInteger(report.ticks), true);
  assert.equal(Number.isInteger(report.seed), true);
  assert.equal(Number.isInteger(report.ticksExecuted), true);

  assert.equal(Array.isArray(report.processors), true);
  for (const processor of report.processors) {
    assert.equal(typeof processor.name, 'string');
    assert.equal(typeof processor.deterministic, 'boolean');
    assert.equal(Array.isArray(processor.requiredComponents), true);
  }

  assertStateSnapshotV1(report.initialSnapshot);
  assertStateSnapshotV1(report.finalSnapshot);

  assert.equal(Array.isArray(report.steps), true);
  for (const step of report.steps) {
    assert.equal(Number.isInteger(step.tick), true);
    assert.equal(Array.isArray(step.processors), true);
    for (const processor of step.processors) {
      assert.equal(typeof processor.name, 'string');
      assert.equal(Array.isArray(processor.mutatedEntities), true);
    }
  }
}
