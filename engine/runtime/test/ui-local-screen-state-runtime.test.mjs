import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, buildUiLocalScreenStateReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_ui_action_semantics.scene.json');

test('buildUiLocalScreenStateReportV1 returns no active scope for scenes without ui.screen', async () => {
  const report = await buildUiLocalScreenStateReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    uiLocalScreenStateReportVersion: 1,
    scene: 'tutorial',
    sourceUiSystemReportVersion: 1,
    sourceUiNavigationFocusReportVersion: 1,
    sourceUiActionSemanticsReportVersion: 1,
    scopePolicy: 'topmost-active-screen',
    focusResolutionPolicy: 'action-semantics-then-navigation-focus',
    focusedScreenId: null,
    focusedEntityId: null,
    focusedWidgetId: null,
    focusedActionId: null,
    heuristicFocusedWidgetId: null,
    focusSource: 'none',
    screens: [],
    warnings: [
      {
        code: 'NO_ACTIVE_SCREEN',
        message: 'No active ui.screen is available for local screen state.'
      }
    ]
  });
});

test('buildUiLocalScreenStateReportV1 uses heuristic local focus when action semantics are absent', async () => {
  const first = await buildUiLocalScreenStateReportV1(productionScenePath);
  const second = await buildUiLocalScreenStateReportV1(productionScenePath);

  assert.deepEqual(first, second);
  assert.equal(first.focusedScreenId, 'menu.main');
  assert.equal(first.focusedWidgetId, 'menu.title');
  assert.equal(first.focusedActionId, null);
  assert.equal(first.heuristicFocusedWidgetId, 'menu.title');
  assert.equal(first.focusSource, 'ui.navigation.focus');
  assert.deepEqual(first.screens, [
    {
      screenId: 'hud.main',
      entityId: 'ui.hud',
      active: true,
      layer: 100,
      localState: 'active-background',
      inActiveStack: true,
      stackIndex: 0,
      inFocusScope: false,
      hasActionSemantics: false,
      candidateCount: 2,
      actionCount: 0,
      focusedWidgetId: null,
      focusedActionId: null,
      focusSource: 'none'
    },
    {
      screenId: 'menu.main',
      entityId: 'ui.menu',
      active: true,
      layer: 200,
      localState: 'active-scope',
      inActiveStack: true,
      stackIndex: 1,
      inFocusScope: true,
      hasActionSemantics: false,
      candidateCount: 3,
      actionCount: 0,
      focusedWidgetId: 'menu.title',
      focusedActionId: null,
      focusSource: 'ui.navigation.focus'
    },
    {
      screenId: 'pause.overlay',
      entityId: 'ui.pause',
      active: false,
      layer: 300,
      localState: 'inactive',
      inActiveStack: false,
      stackIndex: null,
      inFocusScope: false,
      hasActionSemantics: false,
      candidateCount: 0,
      actionCount: 0,
      focusedWidgetId: null,
      focusedActionId: null,
      focusSource: 'none'
    }
  ]);
  assert.deepEqual(first.warnings, [
    {
      code: 'FOCUSED_SCREEN_USES_HEURISTIC_FOCUS',
      screenId: 'menu.main',
      entityId: 'ui.menu',
      widgetId: 'menu.title',
      message:
        'The focused ui.screen has no authored action semantics, so local focus falls back to UiNavigationFocusReport v1 heuristics.'
    }
  ]);
});

test('buildUiLocalScreenStateReportV1 prefers action semantics focus over heuristic focus', async () => {
  const report = await buildUiLocalScreenStateReportV1(actionScenePath);

  assert.equal(report.focusedScreenId, 'menu.main');
  assert.equal(report.focusedEntityId, 'ui.menu');
  assert.equal(report.focusedWidgetId, 'menu.start');
  assert.equal(report.focusedActionId, 'menu.start-mission');
  assert.equal(report.heuristicFocusedWidgetId, 'menu.title');
  assert.equal(report.focusSource, 'ui.action.semantics');
  assert.deepEqual(report.screens.map((screen) => ({
    screenId: screen.screenId,
    localState: screen.localState,
    stackIndex: screen.stackIndex,
    hasActionSemantics: screen.hasActionSemantics,
    candidateCount: screen.candidateCount,
    actionCount: screen.actionCount,
    focusedWidgetId: screen.focusedWidgetId,
    focusedActionId: screen.focusedActionId,
    focusSource: screen.focusSource
  })), [
    {
      screenId: 'hud.main',
      localState: 'active-background',
      stackIndex: 0,
      hasActionSemantics: false,
      candidateCount: 2,
      actionCount: 0,
      focusedWidgetId: null,
      focusedActionId: null,
      focusSource: 'none'
    },
    {
      screenId: 'menu.main',
      localState: 'active-scope',
      stackIndex: 1,
      hasActionSemantics: true,
      candidateCount: 3,
      actionCount: 2,
      focusedWidgetId: 'menu.start',
      focusedActionId: 'menu.start-mission',
      focusSource: 'ui.action.semantics'
    },
    {
      screenId: 'pause.overlay',
      localState: 'inactive',
      stackIndex: null,
      hasActionSemantics: true,
      candidateCount: 0,
      actionCount: 1,
      focusedWidgetId: null,
      focusedActionId: null,
      focusSource: 'none'
    }
  ]);
  assert.deepEqual(report.warnings, [
    {
      code: 'ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS',
      screenId: 'menu.main',
      entityId: 'ui.menu',
      focusedWidgetId: 'menu.start',
      heuristicFocusedWidgetId: 'menu.title',
      message:
        'Authored ui.action.semantics focus overrides the heuristic UiNavigationFocusReport v1 candidate for the focused screen.'
    }
  ]);
});

test('buildUiLocalScreenStateReportV1 reports active screens without a resolved focused widget', async () => {
  const report = await buildUiLocalScreenStateReportV1({
    version: 1,
    metadata: { name: 'ui-local-state-no-focus' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'ui.panel',
        components: [
          {
            kind: 'ui.screen',
            version: 1,
            replicated: false,
            fields: {
              screenId: 'menu.empty',
              active: true,
              widgets: [
                {
                  id: 'menu.root',
                  kind: 'panel',
                  x: 0,
                  y: 0,
                  width: 320,
                  height: 180
                }
              ]
            }
          }
        ]
      }
    ]
  });

  assert.equal(report.focusedScreenId, 'menu.empty');
  assert.equal(report.focusedWidgetId, null);
  assert.equal(report.focusSource, 'none');
  assert.deepEqual(report.warnings, [
    {
      code: 'NO_FOCUSED_WIDGET',
      screenId: 'menu.empty',
      entityId: 'ui.panel',
      message: 'The focused ui.screen has no resolved focused widget in ui.action.semantics or UiNavigationFocusReport v1.'
    }
  ]);
});

test('ui local screen state report does not add RenderSnapshot v1 drawCalls', async () => {
  await buildUiLocalScreenStateReportV1(actionScenePath);
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

test('buildUiLocalScreenStateReportV1 fails predictably for invalid ui.action.semantics scene files', async () => {
  await assert.rejects(
    () => buildUiLocalScreenStateReportV1(invalidScenePath),
    /Scene validation failed/
  );
});
