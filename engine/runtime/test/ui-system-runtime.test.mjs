import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, buildUiSystemReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const prefabScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'ui-screen-prefab.scene.json');
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_ui_screen_widget.scene.json');

test('buildUiSystemReportV1 returns empty report for scenes without ui.screen', async () => {
  const report = await buildUiSystemReportV1(tutorialScenePath);

  assert.deepEqual(report, {
    uiSystemReportVersion: 1,
    scene: 'tutorial',
    screens: [],
    warnings: []
  });
});

test('buildUiSystemReportV1 returns deterministic widget trees for prefab-backed ui screens', async () => {
  const first = await buildUiSystemReportV1(prefabScenePath);
  const second = await buildUiSystemReportV1(prefabScenePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    uiSystemReportVersion: 1,
    scene: 'ui-screen-prefab-fixture',
    screens: [
      {
        screenId: 'hud.main',
        entityId: 'ui.hud',
        active: true,
        layer: 100,
        widgets: [
          {
            widgetId: 'hud.root',
            kind: 'panel',
            text: null,
            x: 0,
            y: 0,
            width: 320,
            height: 48,
            parentWidgetId: null,
            depth: 0
          },
          {
            widgetId: 'score.label',
            kind: 'label',
            text: 'Score: 000',
            x: 8,
            y: 8,
            width: null,
            height: null,
            parentWidgetId: 'hud.root',
            depth: 1
          },
          {
            widgetId: 'lives.label',
            kind: 'label',
            text: 'Lives: 3',
            x: 240,
            y: 8,
            width: null,
            height: null,
            parentWidgetId: 'hud.root',
            depth: 1
          }
        ],
        widgetTree: [
          {
            widgetId: 'hud.root',
            kind: 'panel',
            text: null,
            x: 0,
            y: 0,
            width: 320,
            height: 48,
            children: [
              {
                widgetId: 'score.label',
                kind: 'label',
                text: 'Score: 000',
                x: 8,
                y: 8,
                width: null,
                height: null,
                children: []
              },
              {
                widgetId: 'lives.label',
                kind: 'label',
                text: 'Lives: 3',
                x: 240,
                y: 8,
                width: null,
                height: null,
                children: []
              }
            ]
          }
        ]
      }
    ],
    warnings: []
  });
});

test('buildUiSystemReportV1 covers production menu, HUD and inactive pause screens', async () => {
  const first = await buildUiSystemReportV1(productionScenePath);
  const second = await buildUiSystemReportV1(productionScenePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    uiSystemReportVersion: 1,
    scene: 'ui-production-screens',
    screens: [
      {
        screenId: 'hud.main',
        entityId: 'ui.hud',
        active: true,
        layer: 100,
        widgets: [
          {
            widgetId: 'hud.root',
            kind: 'panel',
            text: null,
            x: 0,
            y: 0,
            width: 320,
            height: 40,
            parentWidgetId: null,
            depth: 0
          },
          {
            widgetId: 'hud.score',
            kind: 'label',
            text: 'Score 000',
            x: 8,
            y: 8,
            width: null,
            height: null,
            parentWidgetId: 'hud.root',
            depth: 1
          },
          {
            widgetId: 'hud.goal',
            kind: 'label',
            text: 'Find the gate',
            x: 176,
            y: 8,
            width: null,
            height: null,
            parentWidgetId: 'hud.root',
            depth: 1
          }
        ],
        widgetTree: [
          {
            widgetId: 'hud.root',
            kind: 'panel',
            text: null,
            x: 0,
            y: 0,
            width: 320,
            height: 40,
            children: [
              {
                widgetId: 'hud.score',
                kind: 'label',
                text: 'Score 000',
                x: 8,
                y: 8,
                width: null,
                height: null,
                children: []
              },
              {
                widgetId: 'hud.goal',
                kind: 'label',
                text: 'Find the gate',
                x: 176,
                y: 8,
                width: null,
                height: null,
                children: []
              }
            ]
          }
        ]
      },
      {
        screenId: 'menu.main',
        entityId: 'ui.menu',
        active: true,
        layer: 200,
        widgets: [
          {
            widgetId: 'menu.root',
            kind: 'panel',
            text: null,
            x: 48,
            y: 48,
            width: 224,
            height: 136,
            parentWidgetId: null,
            depth: 0
          },
          {
            widgetId: 'menu.title',
            kind: 'label',
            text: 'Skyline Rescue',
            x: 24,
            y: 16,
            width: null,
            height: null,
            parentWidgetId: 'menu.root',
            depth: 1
          },
          {
            widgetId: 'menu.start',
            kind: 'label',
            text: 'Start Mission',
            x: 32,
            y: 56,
            width: null,
            height: null,
            parentWidgetId: 'menu.root',
            depth: 1
          },
          {
            widgetId: 'menu.continue',
            kind: 'label',
            text: 'Continue Mission',
            x: 32,
            y: 80,
            width: null,
            height: null,
            parentWidgetId: 'menu.root',
            depth: 1
          }
        ],
        widgetTree: [
          {
            widgetId: 'menu.root',
            kind: 'panel',
            text: null,
            x: 48,
            y: 48,
            width: 224,
            height: 136,
            children: [
              {
                widgetId: 'menu.title',
                kind: 'label',
                text: 'Skyline Rescue',
                x: 24,
                y: 16,
                width: null,
                height: null,
                children: []
              },
              {
                widgetId: 'menu.start',
                kind: 'label',
                text: 'Start Mission',
                x: 32,
                y: 56,
                width: null,
                height: null,
                children: []
              },
              {
                widgetId: 'menu.continue',
                kind: 'label',
                text: 'Continue Mission',
                x: 32,
                y: 80,
                width: null,
                height: null,
                children: []
              }
            ]
          }
        ]
      },
      {
        screenId: 'pause.overlay',
        entityId: 'ui.pause',
        active: false,
        layer: 300,
        widgets: [
          {
            widgetId: 'pause.root',
            kind: 'panel',
            text: null,
            x: 40,
            y: 44,
            width: 240,
            height: 120,
            parentWidgetId: null,
            depth: 0
          },
          {
            widgetId: 'pause.title',
            kind: 'label',
            text: 'Paused',
            x: 32,
            y: 24,
            width: null,
            height: null,
            parentWidgetId: 'pause.root',
            depth: 1
          },
          {
            widgetId: 'pause.resume',
            kind: 'label',
            text: 'Resume Mission',
            x: 32,
            y: 64,
            width: null,
            height: null,
            parentWidgetId: 'pause.root',
            depth: 1
          }
        ],
        widgetTree: [
          {
            widgetId: 'pause.root',
            kind: 'panel',
            text: null,
            x: 40,
            y: 44,
            width: 240,
            height: 120,
            children: [
              {
                widgetId: 'pause.title',
                kind: 'label',
                text: 'Paused',
                x: 32,
                y: 24,
                width: null,
                height: null,
                children: []
              },
              {
                widgetId: 'pause.resume',
                kind: 'label',
                text: 'Resume Mission',
                x: 32,
                y: 64,
                width: null,
                height: null,
                children: []
              }
            ]
          }
        ]
      }
    ],
    warnings: []
  });
});

test('ui.screen production fixture does not add RenderSnapshot v1 drawCalls', async () => {
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

test('buildUiSystemReportV1 supports raw scene objects and defaults active/layer/coords deterministically', async () => {
  const report = await buildUiSystemReportV1({
    version: 1,
    metadata: { name: 'ui-inline-raw' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'ui.main',
        components: [
          {
            kind: 'ui.screen',
            version: 1,
            replicated: false,
            fields: {
              screenId: 'menu.main',
              widgets: [
                {
                  id: 'title.label',
                  kind: 'label',
                  text: 'Start'
                }
              ]
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(report.screens, [
    {
      screenId: 'menu.main',
      entityId: 'ui.main',
      active: true,
      layer: 0,
      widgets: [
        {
          widgetId: 'title.label',
          kind: 'label',
          text: 'Start',
          x: 0,
          y: 0,
          width: null,
          height: null,
          parentWidgetId: null,
          depth: 0
        }
      ],
      widgetTree: [
        {
          widgetId: 'title.label',
          kind: 'label',
          text: 'Start',
          x: 0,
          y: 0,
          width: null,
          height: null,
          children: []
        }
      ]
    }
  ]);
});

test('buildUiSystemReportV1 fails predictably for invalid ui.screen scene files', async () => {
  await assert.rejects(
    () => buildUiSystemReportV1(invalidScenePath),
    /Scene validation failed/
  );
});
