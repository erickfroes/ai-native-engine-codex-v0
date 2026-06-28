import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_ui_screen_widget.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-ui-navigation-focus returns empty focus scope for scenes without ui.screen', () => {
  const result = runCli(['inspect-ui-navigation-focus', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
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

test('inspect-ui-navigation-focus prints stable readable output without --json', () => {
  const result = runCli(['inspect-ui-navigation-focus', productionScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: ui-production-screens/);
  assert.match(result.stdout, /UI navigation focus report version: 1/);
  assert.match(result.stdout, /Scope policy: topmost-active-screen/);
  assert.match(result.stdout, /Focused screen: menu\.main/);
  assert.match(result.stdout, /Initial focus widget: menu\.title/);
  assert.match(result.stdout, /Candidates: 3/);
  assert.match(result.stdout, /- menu\.start: screen=menu\.main index=1 previous=menu\.title next=menu\.continue/);
  assert.match(result.stdout, /Warnings: 4/);
});

test('inspect-ui-navigation-focus summarizes production candidates in deterministic order', () => {
  const result = runCli(['inspect-ui-navigation-focus', productionScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.focusedScreenId, 'menu.main');
  assert.deepEqual(report.candidates.map((candidate) => candidate.widgetId), [
    'menu.title',
    'menu.start',
    'menu.continue'
  ]);
  assert.deepEqual(report.candidates.map((candidate) => candidate.candidateIndex), [0, 1, 2]);
  assert.deepEqual(report.screens.map((screen) => screen.inFocusScope), [false, true, false]);
});

test('inspect-ui-navigation-focus fails predictably for invalid ui.screen scenes', () => {
  const result = runCli(['inspect-ui-navigation-focus', invalidScenePath, '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Scene validation failed/);
});
