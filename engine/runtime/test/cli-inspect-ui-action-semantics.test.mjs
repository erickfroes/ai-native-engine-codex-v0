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
const invalidScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_ui_action_semantics.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-ui-action-semantics returns empty scope for scenes without ui.screen', () => {
  const result = runCli(['inspect-ui-action-semantics', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
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

test('inspect-ui-action-semantics prints stable readable output without --json', () => {
  const result = runCli(['inspect-ui-action-semantics', actionScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: ui-action-semantics/);
  assert.match(result.stdout, /UI action semantics report version: 1/);
  assert.match(result.stdout, /Scope policy: topmost-active-screen/);
  assert.match(result.stdout, /Focused screen: menu\.main/);
  assert.match(result.stdout, /Initial focus widget: menu\.start/);
  assert.match(result.stdout, /Actions: 2/);
  assert.match(result.stdout, /- menu\.start: screen=menu\.main action=menu\.start-mission index=0 previous=\(none\) next=menu\.continue/);
  assert.match(result.stdout, /Warnings: 0/);
});

test('inspect-ui-action-semantics summarizes authored actions in deterministic order', () => {
  const result = runCli(['inspect-ui-action-semantics', actionScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.focusedScreenId, 'menu.main');
  assert.equal(report.initialFocusWidgetId, 'menu.start');
  assert.deepEqual(report.actions.map((action) => action.actionId), [
    'menu.start-mission',
    'menu.continue-mission'
  ]);
  assert.deepEqual(report.actions.map((action) => action.actionIndex), [0, 1]);
});

test('inspect-ui-action-semantics fails predictably for invalid ui.action.semantics scenes', () => {
  const result = runCli(['inspect-ui-action-semantics', invalidScenePath, '--json']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Scene validation failed/);
});
