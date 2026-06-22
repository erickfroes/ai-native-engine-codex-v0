import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze([
  'absolutePath',
  'entryScene',
  'entryScenePath',
  'errors',
  'manifest',
  'ok',
  'sceneCompositionManifestReportVersion',
  'scenes',
  'warnings'
]);
const MANIFEST_KEYS = Object.freeze([
  'entryScene',
  'metadata',
  'sceneCompositionManifestVersion',
  'scenes'
]);
const METADATA_KEYS = Object.freeze(['name']);
const MANIFEST_SCENE_KEYS = Object.freeze(['path', 'ref']);
const SCENE_KEYS = Object.freeze([
  'errors',
  'ok',
  'path',
  'ref',
  'scene',
  'summary',
  'warnings'
]);
const SUMMARY_KEYS = Object.freeze([
  'assetRefCount',
  'assetRefs',
  'componentCount',
  'entityCount',
  'name',
  'replicatedComponentCount',
  'systemCount',
  'systems'
]);
const MESSAGE_KEYS = Object.freeze(['message', 'path']);
const ROOT_MESSAGE_KEYS = Object.freeze(['message', 'path', 'ref', 'target']);
const VALID_TARGETS = new Set(['manifest', 'scene']);

function assertMessage(message) {
  assert.equal(typeof message, 'object');
  assert.notEqual(message, null);
  assert.deepEqual(Object.keys(message).sort(), MESSAGE_KEYS);
  assert.equal(typeof message.path, 'string');
  assert.equal(message.path.trim().length > 0, true);
  assert.equal(typeof message.message, 'string');
  assert.equal(message.message.trim().length > 0, true);
}

function assertRootMessage(message) {
  assert.equal(typeof message, 'object');
  assert.notEqual(message, null);
  assert.deepEqual(Object.keys(message).sort(), ROOT_MESSAGE_KEYS);
  assert.equal(VALID_TARGETS.has(message.target), true);
  assert.equal(typeof message.path, 'string');
  assert.equal(message.path.trim().length > 0, true);
  assert.equal(typeof message.message, 'string');
  assert.equal(message.message.trim().length > 0, true);
  if (message.ref !== null) {
    assert.equal(typeof message.ref, 'string');
    assert.equal(message.ref.trim().length > 0, true);
  }
}

function assertSummary(summary) {
  assert.equal(typeof summary, 'object');
  assert.notEqual(summary, null);
  assert.deepEqual(Object.keys(summary).sort(), SUMMARY_KEYS);
  assert.equal(typeof summary.name, 'string');
  assert.equal(summary.name.trim().length > 0, true);

  for (const key of [
    'entityCount',
    'componentCount',
    'replicatedComponentCount',
    'systemCount',
    'assetRefCount'
  ]) {
    assert.equal(Number.isInteger(summary[key]), true);
    assert.equal(summary[key] >= 0, true);
  }

  assert.equal(Array.isArray(summary.systems), true);
  assert.equal(Array.isArray(summary.assetRefs), true);
  assert.equal(summary.systemCount, summary.systems.length);
  assert.equal(summary.assetRefCount, summary.assetRefs.length);
}

function assertManifest(manifest) {
  assert.equal(typeof manifest, 'object');
  assert.notEqual(manifest, null);
  assert.deepEqual(Object.keys(manifest).sort(), MANIFEST_KEYS);
  assert.equal(manifest.sceneCompositionManifestVersion, 1);
  assert.equal(typeof manifest.metadata, 'object');
  assert.notEqual(manifest.metadata, null);
  assert.deepEqual(Object.keys(manifest.metadata).sort(), METADATA_KEYS);
  assert.equal(typeof manifest.metadata.name, 'string');
  assert.equal(manifest.metadata.name.trim().length > 0, true);
  assert.equal(typeof manifest.entryScene, 'string');
  assert.equal(manifest.entryScene.trim().length > 0, true);
  assert.equal(Array.isArray(manifest.scenes), true);
  assert.equal(manifest.scenes.length > 0, true);

  for (const sceneRef of manifest.scenes) {
    assert.equal(typeof sceneRef, 'object');
    assert.notEqual(sceneRef, null);
    assert.deepEqual(Object.keys(sceneRef).sort(), MANIFEST_SCENE_KEYS);
    assert.equal(typeof sceneRef.ref, 'string');
    assert.equal(sceneRef.ref.trim().length > 0, true);
    assert.equal(typeof sceneRef.path, 'string');
    assert.equal(sceneRef.path.trim().length > 0, true);
  }
}

function assertSceneEntry(scene) {
  assert.equal(typeof scene, 'object');
  assert.notEqual(scene, null);
  assert.deepEqual(Object.keys(scene).sort(), SCENE_KEYS);
  if (scene.ref !== null) {
    assert.equal(typeof scene.ref, 'string');
    assert.equal(scene.ref.trim().length > 0, true);
  }
  assert.equal(typeof scene.path, 'string');
  assert.equal(scene.path.trim().length > 0, true);
  assert.equal(typeof scene.ok, 'boolean');
  assert.equal(Array.isArray(scene.errors), true);
  assert.equal(Array.isArray(scene.warnings), true);

  for (const error of scene.errors) {
    assertMessage(error);
  }
  for (const warning of scene.warnings) {
    assertMessage(warning);
  }

  if (scene.ok) {
    assert.equal(typeof scene.scene, 'string');
    assert.equal(scene.scene.trim().length > 0, true);
    assertSummary(scene.summary);
    assert.equal(scene.errors.length, 0);
  } else {
    if (scene.scene !== null) {
      assert.equal(typeof scene.scene, 'string');
      assert.equal(scene.scene.trim().length > 0, true);
    }
    if (scene.summary !== null) {
      assertSummary(scene.summary);
    }
    assert.equal(scene.errors.length > 0, true);
  }
}

export function assertSceneCompositionManifestReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.deepEqual(Object.keys(report).sort(), ROOT_KEYS);
  assert.equal(report.sceneCompositionManifestReportVersion, 1);
  assert.equal(typeof report.ok, 'boolean');
  assert.equal(typeof report.absolutePath, 'string');
  assert.equal(report.absolutePath.trim().length > 0, true);

  if (report.manifest !== null) {
    assertManifest(report.manifest);
  }

  if (report.entryScene !== null) {
    assert.equal(typeof report.entryScene, 'string');
    assert.equal(report.entryScene.trim().length > 0, true);
  }
  if (report.entryScenePath !== null) {
    assert.equal(typeof report.entryScenePath, 'string');
    assert.equal(report.entryScenePath.trim().length > 0, true);
  }

  assert.equal(Array.isArray(report.scenes), true);
  for (const scene of report.scenes) {
    assertSceneEntry(scene);
  }

  assert.equal(Array.isArray(report.errors), true);
  assert.equal(Array.isArray(report.warnings), true);
  for (const error of report.errors) {
    assertRootMessage(error);
  }
  for (const warning of report.warnings) {
    assertRootMessage(warning);
  }

  assert.equal(report.ok, report.errors.length === 0);
  if (report.ok) {
    assert.equal(report.scenes.every((scene) => scene.ok), true);
  } else if (report.scenes.some((scene) => !scene.ok)) {
    assert.equal(report.errors.length > 0, true);
  }

  if (report.ok) {
    assert.notEqual(report.manifest, null);
    assert.notEqual(report.entryScene, null);
    assert.notEqual(report.entryScenePath, null);
    assert.ok(report.scenes.some((scene) => scene.ref === report.entryScene && scene.path === report.entryScenePath));
  }
}

export function assertSceneCompositionManifestReportV1Rejects(report) {
  assert.throws(() => assertSceneCompositionManifestReportV1(report));
}
