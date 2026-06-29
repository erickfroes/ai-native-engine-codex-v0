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
const navigateNextPath = path.join(repoRoot, 'fixtures', 'ui-input', 'navigate-next.ui-explicit-input.json');
const activatePath = path.join(repoRoot, 'fixtures', 'ui-input', 'activate.ui-explicit-input.json');
const invalidInputPath = path.join(repoRoot, 'fixtures', 'ui-input', 'invalid.version.ui-explicit-input.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-ui-explicit-input-step returns deterministic noop step for scenes without ui.screen', () => {
  const result = runCli([
    'inspect-ui-explicit-input-step',
    tutorialScenePath,
    '--ui-explicit-input',
    activatePath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.uiExplicitInputStepReportVersion, 1);
  assert.equal(report.scene, 'tutorial');
  assert.equal(report.stepType, 'noop');
  assert.equal(report.actionType, 'activate');
  assert.equal(report.direction, 0);
  assert.equal(report.inputHandled, false);
  assert.deepEqual(report.warnings.map((warning) => warning.code).sort(), [
    'NO_ACTIONS_AVAILABLE',
    'NO_ACTIVE_SCREEN'
  ]);
});

test('inspect-ui-explicit-input-step prints stable readable output without --json', () => {
  const result = runCli([
    'inspect-ui-explicit-input-step',
    actionScenePath,
    '--ui-explicit-input',
    navigateNextPath
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: ui-action-semantics/);
  assert.match(result.stdout, /UI explicit input step report version: 1/);
  assert.match(result.stdout, /Action type: navigate/);
  assert.match(result.stdout, /Direction: 1/);
  assert.match(result.stdout, /Step type: focus-move/);
  assert.match(result.stdout, /Input handled: true/);
  assert.match(result.stdout, /Focused screen: menu\.main/);
  assert.match(result.stdout, /Focused widget: menu\.start/);
});

test('inspect-ui-explicit-input-step accepts valid UI explicit input files', () => {
  const result = runCli([
    'inspect-ui-explicit-input-step',
    actionScenePath,
    '--ui-explicit-input',
    navigateNextPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.scene, 'ui-action-semantics');
  assert.equal(report.stepType, 'focus-move');
  assert.equal(report.inputHandled, true);
  assert.equal(report.focusedActionIdBefore, 'menu.start-mission');
  assert.equal(report.focusedActionIdAfter, 'menu.continue-mission');
});

test('inspect-ui-explicit-input-step fails for missing or invalid UI explicit input', () => {
  const missingArg = runCli(['inspect-ui-explicit-input-step', actionScenePath]);
  const invalidInput = runCli([
    'inspect-ui-explicit-input-step',
    actionScenePath,
    '--ui-explicit-input',
    invalidInputPath
  ]);

  assert.notEqual(missingArg.status, 0);
  assert.match(missingArg.stderr, /inspect-ui-explicit-input-step: --ui-explicit-input is required/);
  assert.notEqual(invalidInput.status, 0);
  assert.match(invalidInput.stderr, /ui explicit input is invalid/);
});

test('inspect-ui-explicit-input-step returns noop for scenes without action semantics', () => {
  const result = runCli([
    'inspect-ui-explicit-input-step',
    productionScenePath,
    '--ui-explicit-input',
    navigateNextPath,
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.stepType, 'noop');
  assert.deepEqual(report.warnings.some((warning) => warning.code === 'NO_ACTIONS_AVAILABLE'), true);
});
