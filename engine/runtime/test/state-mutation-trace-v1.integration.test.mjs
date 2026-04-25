import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  simulateStateV1,
  simulateStateV1WithMutationTrace
} from '../src/index.mjs';
import { assertStateMutationTraceV1 } from './helpers/assertStateMutationTraceV1.mjs';
import { assertStateSimulationReportV1 } from './helpers/assertStateSimulationReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const movementPath = path.join(repoRoot, 'scenes', 'state', 'movement.scene.json');

test('simulateStateV1WithMutationTrace returns report + deterministic StateMutationTrace v1 for movement scene', async () => {
  const first = await simulateStateV1WithMutationTrace(movementPath, { ticks: 3, seed: 10 });
  const second = await simulateStateV1WithMutationTrace(movementPath, { ticks: 3, seed: 10 });

  assert.deepEqual(Object.keys(first).sort(), ['mutationTrace', 'report']);

  assertStateSimulationReportV1(first.report);
  assert.equal(first.report.stateSimulationReportVersion, 1);

  assertStateMutationTraceV1(first.mutationTrace);
  assert.equal(first.mutationTrace.scene, 'movement');
  assert.equal(first.mutationTrace.ticks, 3);
  assert.equal(first.mutationTrace.seed, 10);
  assert.equal(first.mutationTrace.ticksExecuted, 3);
  assert.equal(first.mutationTrace.mutationsByTick.length, 3);

  const expected = [
    { before: { x: 0, y: 0 }, after: { x: 2, y: 3 } },
    { before: { x: 2, y: 3 }, after: { x: 4, y: 6 } },
    { before: { x: 4, y: 6 }, after: { x: 6, y: 9 } }
  ];

  for (let index = 0; index < first.mutationTrace.mutationsByTick.length; index += 1) {
    const tick = first.mutationTrace.mutationsByTick[index];
    assert.equal(tick.tick, index + 1);
    assert.equal(tick.processors.length, 1);
    assert.equal(tick.processors[0].name, 'movement.integrate');

    assert.equal(tick.processors[0].mutations.length, 1);
    const mutation = tick.processors[0].mutations[0];
    assert.equal(mutation.entityId, 'player');
    assert.equal(mutation.component, 'transform');
    assert.deepEqual(mutation.before, expected[index].before);
    assert.deepEqual(mutation.after, expected[index].after);
    assert.deepEqual(mutation.fieldsChanged, ['x', 'y']);
  }

  const reportWithoutTrace = await simulateStateV1(movementPath, { ticks: 3, seed: 10 });
  assertStateSimulationReportV1(reportWithoutTrace);
  assert.deepEqual(first.report, reportWithoutTrace);

  assert.deepEqual(first, second);
});
