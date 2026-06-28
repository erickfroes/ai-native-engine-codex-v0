import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, buildUiNavigationFocusReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_ui_screen_widget.scene.json');

test('buildUiNavigationFocusReportV1 returns no active scope for scenes without ui.screen', async () => {
  const report = await buildUiNavigationFocusReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    uiNavigationFocusReportVersion: 1,
    scene: 'tutorial',
    sourceUiSystemReportVersion: 1,
    scopePolicy: 'topmost-active-screen',
    focusedScreenId: null,
    focusedEntityId: null,
    initialFocusWidgetId: null,
    screens: [],
    candidates: [],
    warnings: [
      {
        code: 'NO_ACTIVE_SCREEN',
        message: 'No active ui.screen is available for the focus scope.'
      }
    ]
  });
});

test('buildUiNavigationFocusReportV1 derives topmost active screen candidates deterministically', async () => {
  const first = await buildUiNavigationFocusReportV1(productionScenePath);
  const second = await buildUiNavigationFocusReportV1(productionScenePath);

  assert.deepEqual(first, second);
  assert.equal(first.focusedScreenId, 'menu.main');
  assert.equal(first.focusedEntityId, 'ui.menu');
  assert.equal(first.initialFocusWidgetId, 'menu.title');
  assert.deepEqual(first.screens, [
    {
      screenId: 'hud.main',
      entityId: 'ui.hud',
      active: true,
      layer: 100,
      inFocusScope: false,
      candidateCount: 2
    },
    {
      screenId: 'menu.main',
      entityId: 'ui.menu',
      active: true,
      layer: 200,
      inFocusScope: true,
      candidateCount: 3
    },
    {
      screenId: 'pause.overlay',
      entityId: 'ui.pause',
      active: false,
      layer: 300,
      inFocusScope: false,
      candidateCount: 0
    }
  ]);
  assert.deepEqual(first.candidates.map((candidate) => ({
    widgetId: candidate.widgetId,
    text: candidate.text,
    previous: candidate.previousCandidateWidgetId,
    next: candidate.nextCandidateWidgetId
  })), [
    {
      widgetId: 'menu.title',
      text: 'Skyline Rescue',
      previous: null,
      next: 'menu.start'
    },
    {
      widgetId: 'menu.start',
      text: 'Start Mission',
      previous: 'menu.title',
      next: 'menu.continue'
    },
    {
      widgetId: 'menu.continue',
      text: 'Continue Mission',
      previous: 'menu.start',
      next: null
    }
  ]);
  assert.deepEqual(first.warnings.map((warning) => warning.code), [
    'PARTIAL_WIDGET_GEOMETRY',
    'PARTIAL_WIDGET_GEOMETRY',
    'PARTIAL_WIDGET_GEOMETRY',
    'DERIVED_CANDIDATES_HAVE_NO_ACTION_SEMANTICS'
  ]);
});

test('buildUiNavigationFocusReportV1 reports active screens without focus candidates', async () => {
  const report = await buildUiNavigationFocusReportV1({
    version: 1,
    metadata: { name: 'ui-navigation-no-candidates' },
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

  assert.deepEqual(report.candidates, []);
  assert.deepEqual(report.warnings, [
    {
      code: 'NO_FOCUS_CANDIDATES',
      screenId: 'menu.empty',
      entityId: 'ui.panel',
      message: 'The focus scope has no leaf label widgets to derive navigation candidates from.'
    }
  ]);
});

test('buildUiNavigationFocusReportV1 uses deterministic topmost active screen tie-breaks', async () => {
  const report = await buildUiNavigationFocusReportV1({
    version: 1,
    metadata: { name: 'ui-navigation-layer-tie' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'ui.alpha',
        components: [
          {
            kind: 'ui.screen',
            version: 1,
            replicated: false,
            fields: {
              screenId: 'alpha',
              active: true,
              layer: 10,
              widgets: [
                {
                  id: 'alpha.label',
                  kind: 'label',
                  text: 'Alpha',
                  width: 32,
                  height: 12
                }
              ]
            }
          }
        ]
      },
      {
        id: 'ui.beta',
        components: [
          {
            kind: 'ui.screen',
            version: 1,
            replicated: false,
            fields: {
              screenId: 'beta',
              active: true,
              layer: 10,
              widgets: [
                {
                  id: 'beta.label',
                  kind: 'label',
                  text: 'Beta',
                  width: 32,
                  height: 12
                }
              ]
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(report.screens.map((screen) => screen.screenId), ['alpha', 'beta']);
  assert.equal(report.focusedScreenId, 'beta');
  assert.deepEqual(report.candidates.map((candidate) => candidate.widgetId), ['beta.label']);
});

test('ui production navigation focus report stays within v1 payload budget', async () => {
  const report = await buildUiNavigationFocusReportV1(productionScenePath);

  assert.ok(report.candidates.length <= 64);
  assert.ok(JSON.stringify(report).length <= 4096);
  assert.ok(report.warnings.length <= report.candidates.length + 1);
});

test('ui navigation focus report does not add RenderSnapshot v1 drawCalls', async () => {
  await buildUiNavigationFocusReportV1(productionScenePath);
  const snapshot = await buildRenderSnapshotV1(productionScenePath);

  assert.deepEqual(snapshot, {
    renderSnapshotVersion: 1,
    scene: 'ui-production-screens',
    tick: 0,
    viewport: {
      width: 320,
      height: 180
    },
    drawCalls: []
  });
});

test('buildUiNavigationFocusReportV1 fails predictably for invalid ui.screen scene files', async () => {
  await assert.rejects(
    () => buildUiNavigationFocusReportV1(invalidScenePath),
    /Scene validation failed/
  );
});
