import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze([
  'errors',
  'from',
  'ok',
  'sceneTransitionReportVersion',
  'to',
  'warnings'
]);
const ENDPOINT_KEYS = Object.freeze([
  'errors',
  'ok',
  'path',
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
const PREFIXED_MESSAGE_KEYS = Object.freeze(['endpoint', 'message', 'path']);
const VALID_ENDPOINTS = new Set(['from', 'to', 'transition']);

function assertMessage(message) {
  assert.equal(typeof message, 'object');
  assert.notEqual(message, null);
  assert.deepEqual(Object.keys(message).sort(), MESSAGE_KEYS);
  assert.equal(typeof message.path, 'string');
  assert.equal(message.path.trim().length > 0, true);
  assert.equal(typeof message.message, 'string');
  assert.equal(message.message.trim().length > 0, true);
}

function assertPrefixedMessage(message) {
  assert.equal(typeof message, 'object');
  assert.notEqual(message, null);
  assert.deepEqual(Object.keys(message).sort(), PREFIXED_MESSAGE_KEYS);
  assert.equal(VALID_ENDPOINTS.has(message.endpoint), true);
  assert.equal(typeof message.path, 'string');
  assert.equal(message.path.trim().length > 0, true);
  assert.equal(typeof message.message, 'string');
  assert.equal(message.message.trim().length > 0, true);
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

  for (const system of summary.systems) {
    assert.equal(typeof system, 'string');
    assert.equal(system.trim().length > 0, true);
  }

  for (const assetRef of summary.assetRefs) {
    assert.equal(typeof assetRef, 'string');
    assert.equal(assetRef.trim().length > 0, true);
  }
}

function assertEndpoint(endpoint) {
  assert.equal(typeof endpoint, 'object');
  assert.notEqual(endpoint, null);
  assert.deepEqual(Object.keys(endpoint).sort(), ENDPOINT_KEYS);
  assert.equal(typeof endpoint.path, 'string');
  assert.equal(endpoint.path.trim().length > 0, true);
  assert.equal(typeof endpoint.ok, 'boolean');

  assert.equal(Array.isArray(endpoint.errors), true);
  assert.equal(Array.isArray(endpoint.warnings), true);
  for (const error of endpoint.errors) {
    assertMessage(error);
  }
  for (const warning of endpoint.warnings) {
    assertMessage(warning);
  }

  if (endpoint.ok) {
    assert.equal(typeof endpoint.scene, 'string');
    assert.equal(endpoint.scene.trim().length > 0, true);
    assertSummary(endpoint.summary);
    assert.equal(endpoint.errors.length, 0);
  } else {
    if (endpoint.scene !== null) {
      assert.equal(typeof endpoint.scene, 'string');
      assert.equal(endpoint.scene.trim().length > 0, true);
    }
    if (endpoint.summary !== null) {
      assertSummary(endpoint.summary);
    }
    assert.equal(endpoint.errors.length > 0, true);
  }
}

export function assertSceneTransitionReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.deepEqual(Object.keys(report).sort(), ROOT_KEYS);
  assert.equal(report.sceneTransitionReportVersion, 1);
  assert.equal(typeof report.ok, 'boolean');

  assertEndpoint(report.from);
  assertEndpoint(report.to);

  assert.equal(Array.isArray(report.errors), true);
  assert.equal(Array.isArray(report.warnings), true);
  for (const error of report.errors) {
    assertPrefixedMessage(error);
  }
  for (const warning of report.warnings) {
    assertPrefixedMessage(warning);
  }

  assert.equal(report.ok, report.errors.length === 0);
  assert.equal(report.from.ok && report.to.ok, report.ok);
}

export function assertSceneTransitionReportV1Rejects(report) {
  assert.throws(() => assertSceneTransitionReportV1(report));
}
