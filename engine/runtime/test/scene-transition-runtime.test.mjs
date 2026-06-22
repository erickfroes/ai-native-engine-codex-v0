import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSceneTransitionReportV1 } from '../src/index.mjs';
import { assertSceneTransitionReportV1 } from './helpers/assertSceneTransitionReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const sourceScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-transition-source.scene.json');
const targetScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-transition-target.scene.json');
const invalidTargetScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'invalid_camera_viewport_x.scene.json');
const missingTargetScenePath = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'missing-scene-transition-target.scene.json');

test('buildSceneTransitionReportV1 returns deterministic valid source and target summaries', async () => {
  const first = await buildSceneTransitionReportV1({
    fromPath: sourceScenePath,
    toPath: targetScenePath
  });
  const second = await buildSceneTransitionReportV1({
    fromPath: sourceScenePath,
    toPath: targetScenePath
  });

  assertSceneTransitionReportV1(first);
  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    sceneTransitionReportVersion: 1,
    ok: true,
    from: {
      path: sourceScenePath,
      ok: true,
      scene: 'scene-transition-source',
      summary: {
        name: 'scene-transition-source',
        entityCount: 1,
        componentCount: 1,
        replicatedComponentCount: 0,
        systemCount: 1,
        assetRefCount: 0,
        systems: ['core.loop'],
        assetRefs: []
      },
      errors: [],
      warnings: []
    },
    to: {
      path: targetScenePath,
      ok: true,
      scene: 'scene-transition-target',
      summary: {
        name: 'scene-transition-target',
        entityCount: 1,
        componentCount: 1,
        replicatedComponentCount: 0,
        systemCount: 1,
        assetRefCount: 0,
        systems: ['core.loop'],
        assetRefs: []
      },
      errors: [],
      warnings: []
    },
    errors: [],
    warnings: []
  });
});

test('buildSceneTransitionReportV1 reports invalid target scene without throwing', async () => {
  const report = await buildSceneTransitionReportV1({
    fromPath: sourceScenePath,
    toPath: invalidTargetScenePath
  });

  assertSceneTransitionReportV1(report);
  assert.equal(report.ok, false);
  assert.equal(report.from.ok, true);
  assert.equal(report.to.ok, false);
  assert.equal(report.to.scene, 'invalid-camera-viewport-x');
  assert.ok(
    report.errors.some(
      (error) =>
        error.endpoint === 'to' &&
        error.path === '$.entities[0].components[0].fields.x' &&
        error.message === 'camera.viewport x must be an integer'
    )
  );
});

test('buildSceneTransitionReportV1 reports missing target scene without throwing', async () => {
  const report = await buildSceneTransitionReportV1({
    fromPath: sourceScenePath,
    toPath: missingTargetScenePath
  });

  assertSceneTransitionReportV1(report);
  assert.equal(report.ok, false);
  assert.equal(report.to.path, missingTargetScenePath);
  assert.equal(report.to.scene, null);
  assert.equal(report.to.summary, null);
  assert.match(report.errors[0].message, /ENOENT: no such file or directory/);
});

test('buildSceneTransitionReportV1 warns when source and target resolve to the same file', async () => {
  const report = await buildSceneTransitionReportV1({
    fromPath: sourceScenePath,
    toPath: sourceScenePath
  });

  assertSceneTransitionReportV1(report);
  assert.equal(report.ok, true);
  assert.deepEqual(report.warnings, [
    {
      endpoint: 'transition',
      path: '$',
      message: 'fromPath and toPath resolve to the same scene file'
    }
  ]);
});

test('buildSceneTransitionReportV1 validates input shape predictably', async () => {
  await assert.rejects(
    () => buildSceneTransitionReportV1(null),
    /buildSceneTransitionReportV1: `input` must be an object/
  );

  await assert.rejects(
    () => buildSceneTransitionReportV1({ fromPath: '', toPath: targetScenePath }),
    /buildSceneTransitionReportV1: `fromPath` must be a non-empty string/
  );

  await assert.rejects(
    () => buildSceneTransitionReportV1({ fromPath: sourceScenePath, toPath: '' }),
    /buildSceneTransitionReportV1: `toPath` must be a non-empty string/
  );
});
