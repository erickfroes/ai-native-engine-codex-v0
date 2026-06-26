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
  getSystemPhaseRegistryV1,
  buildTileCollisionReportV1,
  buildPathfindingGridReportV1,
  buildSceneTransitionReportV1,
  buildSceneCompositionManifestReportV1,
  buildAtlasMaterialManifestReportV1,
  buildVisualRegressionBaselineReportV1
} from '../src/index.mjs';
import { assertLoopReportV1 } from './helpers/assertLoopReportV1.mjs';
import { assertLoopTraceV1 } from './helpers/assertLoopTraceV1.mjs';
import { assertSceneValidationReportV1 } from './helpers/assertSceneValidationReportV1.mjs';
import { assertExecutionPlanV1 } from './helpers/assertExecutionPlanV1.mjs';
import { assertStateMutationTraceV1 } from './helpers/assertStateMutationTraceV1.mjs';
import { assertSystemRegistryV1 } from './helpers/assertSystemRegistryV1.mjs';
import { assertSystemPhaseRegistryV1 } from './helpers/assertSystemPhaseRegistryV1.mjs';
import { assertTileCollisionReportV1 } from './helpers/assertTileCollisionReportV1.mjs';
import { assertPathfindingGridReportV1 } from './helpers/assertPathfindingGridReportV1.mjs';
import { assertSceneTransitionReportV1 } from './helpers/assertSceneTransitionReportV1.mjs';
import { assertSceneCompositionManifestReportV1 } from './helpers/assertSceneCompositionManifestReportV1.mjs';
import { assertAtlasMaterialManifestReportV1 } from './helpers/assertAtlasMaterialManifestReportV1.mjs';
import { assertVisualRegressionBaselineReportV1 } from './helpers/assertVisualRegressionBaselineReportV1.mjs';
import { simulateStateV1WithMutationTrace } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const sceneTransitionSourcePath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'scene-transition-source.scene.json'
);
const sceneTransitionTargetPath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'scene-transition-target.scene.json'
);
const sceneCompositionManifestPath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'scene-composition',
  'three-scene-composition.manifest.json'
);
const atlasMaterialManifestPath = path.join(
  repoRoot,
  'engine',
  'runtime',
  'test',
  'fixtures',
  'atlas-material',
  'starter.atlas-material.json'
);

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

  const mutationTraceEnvelope = await simulateStateV1WithMutationTrace(
    path.join(repoRoot, 'scenes', 'state', 'movement.scene.json'),
    { ticks: 3, seed: 10 }
  );
  assertStateMutationTraceV1(mutationTraceEnvelope.mutationTrace);

  const tileCollisionReport = await buildTileCollisionReportV1(
    path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'tile-collision-solid.scene.json')
  );
  assertTileCollisionReportV1(tileCollisionReport);

  const pathfindingGridReport = await buildPathfindingGridReportV1(
    path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'pathfinding-grid-basic.scene.json')
  );
  assertPathfindingGridReportV1(pathfindingGridReport);

  const sceneTransitionReport = await buildSceneTransitionReportV1({
    fromPath: sceneTransitionSourcePath,
    toPath: sceneTransitionTargetPath
  });
  assertSceneTransitionReportV1(sceneTransitionReport);

  const sceneCompositionReport = await buildSceneCompositionManifestReportV1(sceneCompositionManifestPath);
  assertSceneCompositionManifestReportV1(sceneCompositionReport);

  const atlasMaterialReport = await buildAtlasMaterialManifestReportV1(atlasMaterialManifestPath);
  assertAtlasMaterialManifestReportV1(atlasMaterialReport);

  const visualRegressionBaselineReport = await buildVisualRegressionBaselineReportV1(
    path.join(repoRoot, 'scenes', 'v1-small-2d.scene.json')
  );
  assertVisualRegressionBaselineReportV1(visualRegressionBaselineReport);

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

