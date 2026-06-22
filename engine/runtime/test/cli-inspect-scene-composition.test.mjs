import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertSceneCompositionManifestReportV1 } from './helpers/assertSceneCompositionManifestReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-composition');
const validManifestPath = path.join(fixtureDir, 'three-scene-composition.manifest.json');
const invalidManifestPath = path.join(fixtureDir, 'invalid-scene.manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-scene-composition returns deterministic SceneCompositionManifestReport v1 JSON', () => {
  const first = runCli(['inspect-scene-composition', validManifestPath, '--json']);
  const second = runCli(['inspect-scene-composition', validManifestPath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  assertSceneCompositionManifestReportV1(firstReport);
  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.ok, true);
  assert.equal(firstReport.scenes.length, 3);
});

test('inspect-scene-composition emits a compact readable summary', () => {
  const result = runCli(['inspect-scene-composition', validManifestPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Scene composition manifest report version: 1/);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /Entry scene: boot/);
  assert.match(result.stdout, /Scenes: 3/);
  assert.match(result.stdout, /- town: composition-town/);
});

test('inspect-scene-composition returns status 1 and JSON diagnostics for invalid scene refs', () => {
  const result = runCli(['inspect-scene-composition', invalidManifestPath, '--json']);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assertSceneCompositionManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.target === 'scene' && error.ref === 'broken'));
});

test('inspect-scene-composition reports usage for missing manifest path', () => {
  const result = runCli(['inspect-scene-composition', '--json']);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /inspect-scene-composition <path> \[--json\]/);
});
