import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { simulateStateV1WithMutationTrace } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const movementPath = path.join(repoRoot, 'scenes', 'state', 'movement.scene.json');

test('movement.scene ticks=3 seed=10 traces transform before/after per tick', async () => {
  const { report, mutationTrace } = await simulateStateV1WithMutationTrace(movementPath, {
    ticks: 3,
    seed: 10
  });

  assert.equal(report.stateSimulationReportVersion, 1);
  assert.equal(mutationTrace.stateMutationTraceVersion, 1);

  const expectedByTick = [
    { before: { x: 0, y: 0 }, after: { x: 2, y: 3 } },
    { before: { x: 2, y: 3 }, after: { x: 4, y: 6 } },
    { before: { x: 4, y: 6 }, after: { x: 6, y: 9 } }
  ];

  assert.equal(mutationTrace.mutationsByTick.length, expectedByTick.length);

  mutationTrace.mutationsByTick.forEach((tickEntry, index) => {
    const expected = expectedByTick[index];
    assert.equal(tickEntry.tick, index + 1);
    assert.equal(tickEntry.processors.length, 1);

    const processorEntry = tickEntry.processors[0];
    assert.equal(processorEntry.name, 'movement.integrate');
    assert.equal(processorEntry.mutations.length, 1);

    const mutation = processorEntry.mutations[0];
    assert.equal(mutation.entityId, 'player');
    assert.equal(mutation.component, 'transform');
    assert.deepEqual(mutation.before, expected.before);
    assert.deepEqual(mutation.after, expected.after);
    assert.deepEqual(mutation.fieldsChanged, ['x', 'y']);
  });
});
