import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');
const prefabScenePath = path.join(fixtureDir, 'ui-screen-prefab.scene.json');
const invalidScenePath = path.join(fixtureDir, 'invalid_ui_screen_widget.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-ui-system returns deterministic UiSystemReport v1 JSON', () => {
  const first = runCli(['inspect-ui-system', prefabScenePath, '--json']);
  const second = runCli(['inspect-ui-system', prefabScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);

  const report = JSON.parse(first.stdout);
  assert.equal(report.uiSystemReportVersion, 1);
  assert.equal(report.scene, 'ui-screen-prefab-fixture');
  assert.equal(report.screens.length, 1);
  assert.equal(report.screens[0].widgets.length, 3);
  assert.equal(report.screens[0].widgetTree[0].children.length, 2);
});

test('inspect-ui-system returns empty reports for scenes without ui.screen', () => {
  const result = runCli(['inspect-ui-system', tutorialScenePath, '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    uiSystemReportVersion: 1,
    scene: 'tutorial',
    screens: [],
    warnings: []
  });
});

test('inspect-ui-system prints stable readable output without --json', () => {
  const result = runCli(['inspect-ui-system', prefabScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene: ui-screen-prefab-fixture/);
  assert.match(result.stdout, /UI system report version: 1/);
  assert.match(result.stdout, /Screens: 1/);
  assert.match(result.stdout, /- hud\.main: entity=ui\.hud active=true layer=100 widgets=3/);
  assert.match(result.stdout, /Warnings: 0/);
});

test('inspect-ui-system fails predictably for invalid ui.screen scenes', () => {
  const result = runCli(['inspect-ui-system', invalidScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_ui_screen_widget\.scene\.json/);
});
