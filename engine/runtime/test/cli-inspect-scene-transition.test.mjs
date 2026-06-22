import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertSceneTransitionReportV1 } from './helpers/assertSceneTransitionReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const sourceScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-transition-source.scene.json');
const targetScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-transition-target.scene.json');
const invalidTargetScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_camera_viewport_x.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-scene-transition returns deterministic SceneTransitionReport v1 JSON', () => {
  const first = runCli(['inspect-scene-transition', sourceScenePath, targetScenePath, '--json']);
  const second = runCli(['inspect-scene-transition', sourceScenePath, targetScenePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  assertSceneTransitionReportV1(firstReport);
  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.from.scene, 'scene-transition-source');
  assert.equal(firstReport.to.scene, 'scene-transition-target');
  assert.equal(firstReport.ok, true);
});

test('inspect-scene-transition emits a compact readable summary', () => {
  const result = runCli(['inspect-scene-transition', sourceScenePath, targetScenePath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene transition report version: 1/);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /From: scene-transition-source/);
  assert.match(result.stdout, /To: scene-transition-target/);
});

test('inspect-scene-transition returns status 1 and JSON diagnostics for invalid targets', () => {
  const result = runCli(['inspect-scene-transition', sourceScenePath, invalidTargetScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assertSceneTransitionReportV1(report);
  assert.equal(report.ok, false);
  assert.equal(report.to.ok, false);
  assert.ok(report.errors.some((error) => error.endpoint === 'to'));
});

test('inspect-scene-transition reports usage for missing positional paths', () => {
  const result = runCli(['inspect-scene-transition', sourceScenePath, '--json']);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /inspect-scene-transition <from> <to> \[--json\]/);
});
