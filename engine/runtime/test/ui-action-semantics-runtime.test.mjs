import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildRenderSnapshotV1,
  buildUiActionSemanticsReportV1,
  buildUiNavigationFocusReportV1
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_ui_action_semantics.scene.json');

test('buildUiActionSemanticsReportV1 returns no active scope for scenes without ui.screen', async () => {
  const report = await buildUiActionSemanticsReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    uiActionSemanticsReportVersion: 1,
    scene: 'tutorial',
    sourceUiSystemReportVersion: 1,
    scopePolicy: 'topmost-active-screen',
    focusedScreenId: null,
    focusedEntityId: null,
    initialFocusWidgetId: null,
    screens: [],
    actions: [],
    warnings: [
      {
        code: 'NO_ACTIVE_SCREEN',
        message: 'No active ui.screen is available for the action semantics scope.'
      }
    ]
  });
});

test('buildUiActionSemanticsReportV1 reports authored actions for the topmost active screen deterministically', async () => {
  const first = await buildUiActionSemanticsReportV1(actionScenePath);
  const second = await buildUiActionSemanticsReportV1(actionScenePath);

  assert.deepEqual(first, second);
  assert.equal(first.focusedScreenId, 'menu.main');
  assert.equal(first.focusedEntityId, 'ui.menu');
  assert.equal(first.initialFocusWidgetId, 'menu.start');
  assert.deepEqual(first.screens, [
    {
      screenId: 'hud.main',
      entityId: 'ui.hud',
      active: true,
      layer: 100,
      inActionScope: false,
      hasActionSemantics: false,
      bindingCount: 0,
      actionCount: 0
    },
    {
      screenId: 'menu.main',
      entityId: 'ui.menu',
      active: true,
      layer: 200,
      inActionScope: true,
      hasActionSemantics: true,
      bindingCount: 2,
      actionCount: 2
    },
    {
      screenId: 'pause.overlay',
      entityId: 'ui.pause',
      active: false,
      layer: 300,
      inActionScope: false,
      hasActionSemantics: true,
      bindingCount: 1,
      actionCount: 1
    }
  ]);
  assert.deepEqual(first.actions.map((action) => ({
    widgetId: action.widgetId,
    actionId: action.actionId,
    previous: action.previousActionWidgetId,
    next: action.nextActionWidgetId
  })), [
    {
      widgetId: 'menu.start',
      actionId: 'menu.start-mission',
      previous: null,
      next: 'menu.continue'
    },
    {
      widgetId: 'menu.continue',
      actionId: 'menu.continue-mission',
      previous: 'menu.start',
      next: null
    }
  ]);
  assert.deepEqual(first.warnings, []);
});

test('buildUiActionSemanticsReportV1 warns when the focused screen has no authored semantics', async () => {
  const report = await buildUiActionSemanticsReportV1(productionScenePath);

  assert.equal(report.focusedScreenId, 'menu.main');
  assert.deepEqual(report.actions, []);
  assert.deepEqual(report.warnings, [
    {
      code: 'NO_ACTION_SEMANTICS',
      screenId: 'menu.main',
      entityId: 'ui.menu',
      message: 'The focused ui.screen has no authored ui.action.semantics component.'
    }
  ]);
});

test('ui action semantics do not mutate UiNavigationFocusReport v1 heuristics', async () => {
  const report = await buildUiNavigationFocusReportV1(actionScenePath);

  assert.equal(report.focusedScreenId, 'menu.main');
  assert.equal(report.initialFocusWidgetId, 'menu.title');
  assert.deepEqual(report.candidates.map((candidate) => candidate.widgetId), [
    'menu.title',
    'menu.start',
    'menu.continue'
  ]);
});

test('ui action semantics report does not add RenderSnapshot v1 drawCalls', async () => {
  await buildUiActionSemanticsReportV1(actionScenePath);
  const snapshot = await buildRenderSnapshotV1(actionScenePath);

  assert.deepEqual(snapshot, {
    renderSnapshotVersion: 1,
    scene: 'ui-action-semantics',
    tick: 0,
    viewport: {
      width: 320,
      height: 180
    },
    drawCalls: []
  });
});

test('buildUiActionSemanticsReportV1 fails predictably for invalid ui.action.semantics scene files', async () => {
  await assert.rejects(
    () => buildUiActionSemanticsReportV1(invalidScenePath),
    /Scene validation failed/
  );
});
