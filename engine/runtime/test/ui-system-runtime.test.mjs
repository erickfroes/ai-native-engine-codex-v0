import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildUiSystemReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
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
