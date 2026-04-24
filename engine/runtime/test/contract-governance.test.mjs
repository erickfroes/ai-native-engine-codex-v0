import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadSceneFile,
  runMinimalSystemLoop,
  runMinimalSystemLoopWithTrace,
  validateLoopScene,
  createLoopExecutionPlan,
  getSystemRegistryV1,
  getSystemPhaseRegistryV1
} from '../src/index.mjs';
import { assertLoopReportV1 } from './helpers/assertLoopReportV1.mjs';
import { assertLoopTraceV1 } from './helpers/assertLoopTraceV1.mjs';
import { assertSceneValidationReportV1 } from './helpers/assertSceneValidationReportV1.mjs';
import { assertExecutionPlanV1 } from './helpers/assertExecutionPlanV1.mjs';
import { assertSystemRegistryV1 } from './helpers/assertSystemRegistryV1.mjs';
import { assertSystemPhaseRegistryV1 } from './helpers/assertSystemPhaseRegistryV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('contract governance: v1 contract shapes remain strict and aligned', async () => {
  const scene = await loadSceneFile(tutorialScenePath);

  const report = {
    loopReportVersion: 1,
    scene: scene.metadata.name,
    ticks: 4,
    seed: 10,
    ...runMinimalSystemLoop(scene, { ticks: 4, seed: 10 })
  };
  assertLoopReportV1(report);

  const traced = runMinimalSystemLoopWithTrace(scene, { ticks: 4, seed: 10 });
  assertLoopReportV1(traced.report);
  assertLoopTraceV1(traced.trace);

  const validation = await validateLoopScene(tutorialScenePath);
  assertSceneValidationReportV1(validation);

  const plan = await createLoopExecutionPlan(tutorialScenePath, { ticks: 4, seed: 10 });
  assertExecutionPlanV1(plan);

  assertSystemRegistryV1(getSystemRegistryV1());
  assertSystemPhaseRegistryV1(getSystemPhaseRegistryV1());

  assert.equal(plan.estimated.finalState, report.finalState);
  assert.equal(
    traced.trace.systemsPerTick.at(-1).systems.at(-1).stateAfter,
    report.finalState
  );
});

test('contract governance: seed defaults and known final states remain stable', async () => {
  const scene = await loadSceneFile(tutorialScenePath);

  const explicit = runMinimalSystemLoop(scene, { ticks: 4, seed: 10 });
  const defaultSeed = runMinimalSystemLoop(scene, { ticks: 4 });
  const planDefaultSeed = await createLoopExecutionPlan(tutorialScenePath, { ticks: 4 });

  assert.equal(explicit.finalState, 34);
  assert.equal(defaultSeed.finalState, 1361);
  assert.equal(planDefaultSeed.seed, 1337);
  assert.equal(planDefaultSeed.estimated.finalState, 1361);
});

