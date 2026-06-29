import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildRenderSnapshotV1,
  buildUiExplicitInputStepReportV1,
  buildUiInputStepReportV1,
  loadSceneFile
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

const navigateNextInput = Object.freeze({
  uiExplicitInputVersion: 1,
  tick: 1,
  action: {
    type: 'navigate',
    direction: 'next'
  }
});

const navigatePreviousInput = Object.freeze({
  uiExplicitInputVersion: 1,
  tick: 1,
  action: {
    type: 'navigate',
    direction: 'previous'
  }
});

const activateInput = Object.freeze({
  uiExplicitInputVersion: 1,
  tick: 2,
  action: {
    type: 'activate'
  }
});

test('buildUiExplicitInputStepReportV1 focuses next action for navigate next', async () => {
  const report = await buildUiExplicitInputStepReportV1(actionScenePath, {
    uiExplicitInput: navigateNextInput
  });

  assert.equal(report.uiExplicitInputStepReportVersion, 1);
  assert.equal(report.actionType, 'navigate');
  assert.equal(report.direction, 1);
  assert.equal(report.stepType, 'focus-move');
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIndexBefore, 0);
  assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
  assert.equal(report.focusedActionIdAfter, 'menu.continue-mission');
  assert.equal(report.activatedActionId, null);
  assert.deepEqual(report.warnings.map((warning) => warning.code), [
    'ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS'
  ]);
});

test('buildUiExplicitInputStepReportV1 keeps focus on previous boundary navigation', async () => {
  const report = await buildUiExplicitInputStepReportV1(actionScenePath, {
    uiExplicitInput: navigatePreviousInput
  });

  assert.equal(report.actionType, 'navigate');
  assert.equal(report.direction, -1);
  assert.equal(report.stepType, 'focus');
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIndexBefore, 0);
  assert.equal(report.focusedActionIndexAfter, 0);
  assert.equal(report.focusedActionIdAfter, 'menu.start-mission');
  assert.equal(report.warnings.some((warning) => warning.code === 'UI_ACTION_FOCUS_BOUNDARY'), true);
});

test('buildUiExplicitInputStepReportV1 activates focused authored action', async () => {
  const report = await buildUiExplicitInputStepReportV1(actionScenePath, {
    uiExplicitInput: activateInput
  });

  assert.equal(report.actionType, 'activate');
  assert.equal(report.direction, 0);
  assert.equal(report.stepType, 'activate');
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
  assert.equal(report.focusedActionIdAfter, 'menu.start-mission');
  assert.equal(report.activatedActionId, 'menu.start-mission');
});

test('buildUiExplicitInputStepReportV1 returns noop when no actionable actions are available', async () => {
  const report = await buildUiExplicitInputStepReportV1(productionScenePath, {
    uiExplicitInput: navigateNextInput
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

test('buildUiExplicitInputStepReportV1 returns noop with no active UI scope', async () => {
  const report = await buildUiExplicitInputStepReportV1(tutorialScenePath, {
    uiExplicitInput: activateInput
  });

  assert.equal(report.focusedScreenId, null);
  assert.equal(report.focusedEntityId, null);
  assert.equal(report.stepType, 'noop');
  assert.equal(report.direction, 0);
  assert.equal(report.inputHandled, false);
  assert.deepEqual(report.warnings.map((warning) => warning.code).sort(), [
    'NO_ACTIONS_AVAILABLE',
    'NO_ACTIVE_SCREEN'
  ]);
});

test('buildUiExplicitInputStepReportV1 validates explicit input and fails predictably', async () => {
  await assert.rejects(
    () => buildUiExplicitInputStepReportV1(actionScenePath, {}),
    /buildUiExplicitInputStepReportV1: `uiExplicitInput` option is required/
  );

  await assert.rejects(
    () => buildUiExplicitInputStepReportV1(actionScenePath, {
      uiExplicitInput: {
        uiExplicitInputVersion: 2,
        tick: 1,
        action: {
          type: 'navigate',
          direction: 'next'
        }
      }
    }),
    /buildUiExplicitInputStepReportV1: invalid uiExplicitInput/
  );
});

test('explicit input step stays semantically aligned with legacy input step for equivalent navigation', async () => {
  const explicitReport = await buildUiExplicitInputStepReportV1(actionScenePath, {
    uiExplicitInput: navigateNextInput
  });
  const legacyReport = await buildUiInputStepReportV1(actionScenePath, {
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

  assert.deepEqual(
    {
      stepType: explicitReport.stepType,
      inputHandled: explicitReport.inputHandled,
      focusedActionIndexBefore: explicitReport.focusedActionIndexBefore,
      focusedActionIdBefore: explicitReport.focusedActionIdBefore,
      focusedActionIndexAfter: explicitReport.focusedActionIndexAfter,
      focusedActionIdAfter: explicitReport.focusedActionIdAfter,
      activatedActionId: explicitReport.activatedActionId,
      warnings: explicitReport.warnings
    },
    {
      stepType: legacyReport.stepType,
      inputHandled: legacyReport.inputHandled,
      focusedActionIndexBefore: legacyReport.focusedActionIndexBefore,
      focusedActionIdBefore: legacyReport.focusedActionIdBefore,
      focusedActionIndexAfter: legacyReport.focusedActionIndexAfter,
      focusedActionIdAfter: legacyReport.focusedActionIdAfter,
      activatedActionId: legacyReport.activatedActionId,
      warnings: legacyReport.warnings
    }
  );
});

test('explicit input step remains compact and report-only', async () => {
  const scene = await loadSceneFile(actionScenePath);
  const beforeSnapshot = await buildRenderSnapshotV1(scene);
  const report = await buildUiExplicitInputStepReportV1(scene, {
    uiExplicitInput: navigateNextInput
  });
  const afterSnapshot = await buildRenderSnapshotV1(scene);

  assert.deepEqual(afterSnapshot, beforeSnapshot);
  assert.ok(JSON.stringify(report).length <= 2048);
});
