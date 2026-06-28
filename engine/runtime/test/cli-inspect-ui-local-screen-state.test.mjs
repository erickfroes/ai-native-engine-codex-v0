import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_ui_action_semantics.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-ui-local-screen-state returns empty local state scope for scenes without ui.screen', () => {
  const result = runCli(['inspect-ui-local-screen-state', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
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

test('inspect-ui-local-screen-state prints stable readable output without --json', () => {
  const result = runCli(['inspect-ui-local-screen-state', actionScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: ui-action-semantics/);
  assert.match(result.stdout, /UI local screen state report version: 1/);
  assert.match(result.stdout, /Scope policy: topmost-active-screen/);
  assert.match(result.stdout, /Focus resolution policy: action-semantics-then-navigation-focus/);
  assert.match(result.stdout, /Focused screen: menu\.main/);
  assert.match(result.stdout, /Focused widget: menu\.start/);
  assert.match(result.stdout, /Focus source: ui\.action\.semantics/);
  assert.match(result.stdout, /- menu\.main: state=active-scope stackIndex=1 focusSource=ui\.action\.semantics focusedWidget=menu\.start/);
  assert.match(result.stdout, /Warnings: 1/);
});

test('inspect-ui-local-screen-state summarizes heuristic fallback deterministically', () => {
  const result = runCli(['inspect-ui-local-screen-state', productionScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.focusSource, 'ui.navigation.focus');
  assert.equal(report.focusedWidgetId, 'menu.title');
  assert.deepEqual(report.screens.map((screen) => screen.localState), [
    'active-background',
    'active-scope',
    'inactive'
  ]);
  assert.deepEqual(report.screens.map((screen) => screen.stackIndex), [0, 1, null]);
});

test('inspect-ui-local-screen-state fails predictably for invalid ui.action.semantics scenes', () => {
  const result = runCli(['inspect-ui-local-screen-state', invalidScenePath, '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Scene validation failed/);
});
