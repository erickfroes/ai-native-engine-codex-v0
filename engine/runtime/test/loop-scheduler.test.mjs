import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createLoopSchedule,
  createLoopExecutionPlan,
  loadSceneFile,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('loop scheduler builds deterministic per-tick order from scene-declared systems', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));
  const first = createLoopSchedule(scene, { ticks: 4, seed: 10 });
  const second = createLoopSchedule(scene, { ticks: 4, seed: 10 });

  assert.equal(first.schedulerVersion, 1);
  assert.equal(first.ticks, 4);
  assert.equal(first.seed, 10);
  assert.equal(first.systemsPerTick.length, 4);
  assert.deepEqual(first.systemsPerTick[0].systems.map((system) => system.name), [
    'core.loop',
    'input.keyboard',
    'networking.replication'
  ]);
  assert.deepEqual(first, second);
});

test('execution plan systemsPerTick derives from scheduler output', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));
  const schedule = createLoopSchedule(scene, { ticks: 4, seed: 10 });
  const plan = await createLoopExecutionPlan(scenePath('tutorial.scene.json'), { ticks: 4, seed: 10 });
  assert.deepEqual(plan.systemsPerTick, schedule.systemsPerTick);
});

test('trace and report stay aligned with scheduler order', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));
  const schedule = createLoopSchedule(scene, { ticks: 4, seed: 10 });
  const report = runMinimalSystemLoop(scene, { ticks: 4, seed: 10 });
  const traced = runMinimalSystemLoopWithTrace(scene, { ticks: 4, seed: 10 });

  const expectedExecutedSystems = schedule.systemsPerTick.flatMap((tickPlan) => tickPlan.systems.map((system) => system.name));
  assert.deepEqual(report.executedSystems, expectedExecutedSystems);
  assert.deepEqual(
    traced.trace.systemsPerTick.map((tickPlan) => tickPlan.systems.map((system) => system.name)),
    schedule.systemsPerTick.map((tickPlan) => tickPlan.systems.map((system) => system.name))
  );
});

test('scheduler preserves unknown systems and planner/runtime default seed stays 1337', async () => {
  const unknownScene = {
    metadata: { name: 'unknown-scene' },
    entities: [],
    systems: ['unknown.alpha']
  };
  const schedule = createLoopSchedule(unknownScene, { ticks: 2, seed: 11 });
  assert.equal(schedule.systemsPerTick[0].systems[0].known, false);
  assert.equal(schedule.systemsPerTick[0].systems[0].delta, undefined);

  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));
  const defaultSeedSchedule = createLoopSchedule(scene, { ticks: 4 });
  const report = runMinimalSystemLoop(scene, { ticks: 4 });
  const plan = await createLoopExecutionPlan(scenePath('tutorial.scene.json'), { ticks: 4 });

  assert.equal(defaultSeedSchedule.seed, 1337);
  assert.equal(report.finalState, 1361);
  assert.equal(plan.seed, 1337);
  assert.equal(plan.estimated.finalState, 1361);
});

