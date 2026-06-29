import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildRenderSnapshotV1,
  buildUiInputStepReportV1,
  loadSceneFile
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('buildUiInputStepReportV1 focuses the next action for right movement', async () => {
  const report = await buildUiInputStepReportV1(actionScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 1, y: 0 }
        }
      ]
    }
  });

  assert.equal(report.stepType, 'focus-move');
  assert.equal(report.direction, 1);
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIndexBefore, 0);
  assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
  assert.equal(report.focusedWidgetIdBefore, 'menu.start');
  assert.equal(report.focusedActionIndexAfter, 1);
  assert.equal(report.focusedActionIdAfter, 'menu.continue-mission');
  assert.equal(report.focusedWidgetIdAfter, 'menu.continue');
  assert.equal(report.activatedActionId, null);
  assert.equal(report.actionCandidates.length, 2);
  assert.deepEqual(report.actionCandidates.map((action) => action.actionId), [
    'menu.start-mission',
    'menu.continue-mission'
  ]);
  assert.deepEqual(report.warnings.map((warning) => warning.code), [
    'ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS'
  ]);
});

test('buildUiInputStepReportV1 keeps focus on left boundary movement', async () => {
  const report = await buildUiInputStepReportV1(actionScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: -1, y: 0 }
        }
      ]
    }
  });

  assert.equal(report.stepType, 'focus');
  assert.equal(report.direction, -1);
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIndexBefore, 0);
  assert.equal(report.focusedActionIndexAfter, 0);
  assert.equal(report.focusedActionIdAfter, 'menu.start-mission');
  assert.equal(report.activatedActionId, null);
  assert.equal(report.actionCandidates.length, 2);
  assert.equal(report.warnings.some((warning) => warning.code === 'UI_ACTION_FOCUS_BOUNDARY'), true);
});

test('buildUiInputStepReportV1 activates focused action on zero move', async () => {
  const report = await buildUiInputStepReportV1(actionScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 3,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 0, y: 0 }
        }
      ]
    }
  });

  assert.equal(report.stepType, 'activate');
  assert.equal(report.direction, 0);
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIndexBefore, 0);
  assert.equal(report.focusedActionIndexAfter, 0);
  assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
  assert.equal(report.activatedActionId, 'menu.start-mission');
  assert.equal(report.actionCandidates.length, 2);
  assert.equal(report.warnings.some((warning) => warning.code === 'UI_ACTION_FOCUS_BOUNDARY'), false);
});

test('buildUiInputStepReportV1 returns noop when no actionable actions are available', async () => {
  const report = await buildUiInputStepReportV1(productionScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 1, y: 0 }
        }
      ]
    }
  });

  assert.equal(report.stepType, 'noop');
  assert.equal(report.direction, 1);
  assert.equal(report.inputHandled, false);
  assert.equal(report.focusedActionIndexBefore, null);
  assert.equal(report.activatedActionId, null);
  assert.deepEqual(report.actionCandidates, []);
  assert.deepEqual(report.warnings.map((warning) => warning.code).sort(), [
    'FOCUSED_SCREEN_USES_HEURISTIC_FOCUS',
    'NO_ACTIONS_AVAILABLE'
  ]);
});

test('buildUiInputStepReportV1 returns noop with no active UI scope', async () => {
  const report = await buildUiInputStepReportV1(tutorialScenePath, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 2,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 1, y: 1 }
        },
        {
          type: 'move',
          axis: { x: 1, y: 1 }
        },
        {
          type: 'move',
          axis: { x: 0, y: 1 }
        }
      ]
    }
  });

  assert.equal(report.stepType, 'noop');
  assert.equal(report.direction, 1);
  assert.equal(report.inputHandled, false);
  assert.equal(report.focusedScreenId, null);
  assert.equal(report.focusedEntityId, null);
  assert.equal(report.focusedActionIndexBefore, null);
  assert.equal(report.activatedActionId, null);
  assert.deepEqual(report.attemptedMove, { x: 2, y: 3 });
  assert.deepEqual(report.warnings.map((warning) => warning.code).sort(), [
    'NO_ACTIONS_AVAILABLE',
    'NO_ACTIVE_SCREEN'
  ]);
});

test('buildUiInputStepReportV1 validates inputIntent and fails for invalid input', async () => {
  await assert.rejects(
    () => buildUiInputStepReportV1(actionScenePath, {}),
    /buildUiInputStepReportV1: `inputIntent` option is required/
  );

  await assert.rejects(
    () => buildUiInputStepReportV1(actionScenePath, {
      inputIntent: {
        inputIntentVersion: 1,
        tick: 1,
        entityId: 'player.hero'
      }
    }),
    /buildUiInputStepReportV1: invalid inputIntent/
  );
});

test('legacy input step remains compact and report-only', async () => {
  const scene = await loadSceneFile(actionScenePath);
  const beforeSnapshot = await buildRenderSnapshotV1(scene);
  const report = await buildUiInputStepReportV1(scene, {
    inputIntent: {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player.hero',
      actions: [
        {
          type: 'move',
          axis: { x: 1, y: 0 }
        }
      ]
    }
  });
  const afterSnapshot = await buildRenderSnapshotV1(scene);

  assert.deepEqual(afterSnapshot, beforeSnapshot);
  assert.ok(JSON.stringify(report).length <= 2048);
});
