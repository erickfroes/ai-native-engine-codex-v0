import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const actionScenePath = path.join(repoRoot, 'scenes', 'ui-action-semantics.scene.json');
const productionScenePath = path.join(repoRoot, 'scenes', 'ui-production-screens.scene.json');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const moveRightIntentPath = path.join(repoRoot, 'fixtures', 'input', 'move-player-right.intent.json');
const noMoveIntentPath = path.join(repoRoot, 'fixtures', 'input', 'no-player-move.intent.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-ui-input-step returns deterministic noop step for scenes without ui.screen', () => {
  const result = runCli(['inspect-ui-input-step', tutorialScenePath, '--input-intent', noMoveIntentPath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.uiInputStepReportVersion, 1);
  assert.equal(report.scene, 'tutorial');
  assert.equal(report.scopePolicy, 'topmost-active-screen');
  assert.equal(report.stepType, 'noop');
  assert.equal(report.direction, 0);
  assert.equal(report.inputHandled, false);
  assert.equal(report.focusedScreenId, null);
  assert.equal(report.focusedActionIndexBefore, null);
  assert.deepEqual(report.warnings.map((warning) => warning.code).sort(), [
    'NO_ACTIVE_SCREEN',
    'NO_ACTIONS_AVAILABLE'
  ]);
  assert.equal(report.actionCandidates.length, 0);
});

test('inspect-ui-input-step prints stable readable output without --json', () => {
  const result = runCli(['inspect-ui-input-step', actionScenePath, '--input-intent', moveRightIntentPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: ui-action-semantics/);
  assert.match(result.stdout, /UI input step report version: 1/);
  assert.match(result.stdout, /Scope policy: topmost-active-screen/);
  assert.match(result.stdout, /Input intent version: 1/);
  assert.match(result.stdout, /Input intent tick: 1/);
  assert.match(result.stdout, /Direction: 1/);
  assert.match(result.stdout, /Step type: focus-move/);
  assert.match(result.stdout, /Input handled: true/);
  assert.match(result.stdout, /Focused screen: menu\.main/);
  assert.match(result.stdout, /Focused widget: menu\.start/);
});

test('inspect-ui-input-step accepts valid input intent files and returns deterministic focus behavior', () => {
  const result = runCli(['inspect-ui-input-step', actionScenePath, '--input-intent', moveRightIntentPath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.scene, 'ui-action-semantics');
  assert.equal(report.stepType, 'focus-move');
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
  assert.equal(report.focusedActionIdAfter, 'menu.continue-mission');
  assert.deepEqual(report.warnings.map((warning) => warning.code), ['ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS']);
});

test('inspect-ui-input-step fails for missing --input-intent argument', () => {
  const result = runCli(['inspect-ui-input-step', actionScenePath]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /inspect-ui-input-step: --input-intent is required/);
});

test('inspect-ui-input-step fails for invalid input intent paths and scenes', () => {
  const missingIntentResult = runCli([
    'inspect-ui-input-step',
    productionScenePath,
    '--input-intent',
    path.join(repoRoot, 'fixtures', 'input', 'missing.intent.json')
  ]);

  assert.notEqual(missingIntentResult.status, 0);
  assert.match(missingIntentResult.stderr, /ENOENT: no such file or directory/);
  assert.match(missingIntentResult.stderr, /missing\.intent\.json/);

  const result = runCli(['inspect-ui-input-step', productionScenePath, '--input-intent', moveRightIntentPath, '--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.stepType, 'noop');
  assert.deepEqual(report.warnings.some((warning) => warning.code === 'NO_ACTIONS_AVAILABLE'), true);
});
