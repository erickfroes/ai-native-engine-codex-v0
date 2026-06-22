import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSceneCompositionManifestReportV1 } from '../src/index.mjs';
import { assertSceneCompositionManifestReportV1 } from './helpers/assertSceneCompositionManifestReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'scene-composition');
const validManifestPath = path.join(fixtureDir, 'three-scene-composition.manifest.json');

function fixturePath(fileName) {
  return path.join(fixtureDir, fileName);
}

test('buildSceneCompositionManifestReportV1 returns deterministic summaries for three valid scenes', async () => {
  const first = await buildSceneCompositionManifestReportV1(validManifestPath);
  const second = await buildSceneCompositionManifestReportV1(validManifestPath);

  assertSceneCompositionManifestReportV1(first);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  assert.equal(first.entryScene, 'boot');
  assert.equal(first.entryScenePath, fixturePath('boot.scene.json'));
  assert.deepEqual(first.scenes.map((scene) => scene.ref), ['boot', 'town', 'battle']);
  assert.deepEqual(first.scenes.map((scene) => scene.scene), [
    'composition-boot',
    'composition-town',
    'composition-battle'
  ]);
  assert.deepEqual(first.scenes.map((scene) => scene.summary.systems), [
    ['core.loop'],
    ['core.loop', 'input.keyboard'],
    ['core.loop']
  ]);
});

test('buildSceneCompositionManifestReportV1 reports missing and malformed manifests without throwing', async () => {
  const missing = await buildSceneCompositionManifestReportV1(fixturePath('missing.manifest.json'));
  assertSceneCompositionManifestReportV1(missing);
  assert.equal(missing.ok, false);
  assert.equal(missing.manifest, null);
  assert.equal(missing.errors[0].message, 'scene composition manifest file was not found');

  const malformed = await buildSceneCompositionManifestReportV1(fixturePath('invalid-malformed.manifest.json'));
  assertSceneCompositionManifestReportV1(malformed);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.manifest, null);
  assert.equal(malformed.errors[0].message, 'scene composition manifest JSON is malformed');
});

test('buildSceneCompositionManifestReportV1 validates manifest refs and path safety predictably', async () => {
  const duplicateRef = await buildSceneCompositionManifestReportV1(fixturePath('invalid-duplicate-ref.manifest.json'));
  assertSceneCompositionManifestReportV1(duplicateRef);
  assert.ok(
    duplicateRef.errors.some(
      (error) => error.target === 'manifest' && error.path === '$.scenes[1].ref' && error.message === 'duplicate scene ref: boot'
    )
  );

  const duplicatePath = await buildSceneCompositionManifestReportV1(fixturePath('invalid-duplicate-path.manifest.json'));
  assertSceneCompositionManifestReportV1(duplicatePath);
  assert.ok(
    duplicatePath.errors.some(
      (error) =>
        error.target === 'manifest' &&
        error.path === '$.scenes[1].path' &&
        error.message === 'duplicate scene path: boot.scene.json'
    )
  );

  const missingEntry = await buildSceneCompositionManifestReportV1(fixturePath('invalid-entry-scene.manifest.json'));
  assertSceneCompositionManifestReportV1(missingEntry);
  assert.ok(
    missingEntry.errors.some(
      (error) => error.target === 'manifest' && error.path === '$.entryScene' && error.message === 'must reference a scene ref declared in scenes'
    )
  );

  const unsafePath = await buildSceneCompositionManifestReportV1(fixturePath('invalid-unsafe-path.manifest.json'));
  assertSceneCompositionManifestReportV1(unsafePath);
  assert.ok(
    unsafePath.errors.some(
      (error) => error.target === 'manifest' && error.path === '$.scenes[0].path' && error.message === 'must be a safe relative path'
    )
  );

  for (const fileName of [
    'invalid-url-path.manifest.json',
    'invalid-absolute-path.manifest.json',
    'invalid-unc-path.manifest.json'
  ]) {
    const report = await buildSceneCompositionManifestReportV1(fixturePath(fileName));
    assertSceneCompositionManifestReportV1(report);
    assert.ok(
      report.errors.some(
        (error) =>
          error.target === 'manifest' &&
          error.path === '$.scenes[0].path' &&
          error.message === 'must be a safe relative path'
      )
    );
  }

  const wrongExtension = await buildSceneCompositionManifestReportV1(fixturePath('invalid-wrong-extension.manifest.json'));
  assertSceneCompositionManifestReportV1(wrongExtension);
  assert.ok(
    wrongExtension.errors.some(
      (error) =>
        error.target === 'manifest' &&
        error.path === '$.scenes[0].path' &&
        error.message === 'must reference a .scene.json file'
    )
  );
});

test('buildSceneCompositionManifestReportV1 reports invalid referenced scenes', async () => {
  const report = await buildSceneCompositionManifestReportV1(fixturePath('invalid-scene.manifest.json'));

  assertSceneCompositionManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.equal(report.scenes.length, 1);
  assert.equal(report.scenes[0].ref, 'broken');
  assert.equal(report.scenes[0].ok, false);
  assert.equal(report.scenes[0].scene, 'composition-invalid-camera');
  assert.ok(
    report.errors.some(
      (error) =>
        error.target === 'scene' &&
        error.ref === 'broken' &&
        error.path === '$.entities[0].components[0].fields.x' &&
        error.message === 'camera.viewport x must be an integer'
    )
  );
});

test('buildSceneCompositionManifestReportV1 validates input shape predictably', async () => {
  await assert.rejects(
    () => buildSceneCompositionManifestReportV1(''),
    /buildSceneCompositionManifestReportV1: `manifestPath` must be a non-empty string/
  );
});
