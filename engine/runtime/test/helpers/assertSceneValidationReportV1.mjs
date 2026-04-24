import assert from 'node:assert/strict';

import { getSystemRegistryV1 } from '../../src/index.mjs';

const ROOT_KEYS = Object.freeze([
  'errors',
  'scene',
  'sceneValidationReportVersion',
  'systems',
  'valid',
  'warnings'
]);

const ISSUE_KEYS = Object.freeze(['code', 'message', 'path', 'system']);
const SYSTEM_KEYS = Object.freeze(['delta', 'deterministic', 'known', 'name']);

const knownSystems = new Map(
  getSystemRegistryV1().systems.map((system) => [system.name, system])
);

export function assertSceneValidationReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.deepEqual(Object.keys(report).sort(), ROOT_KEYS);
  assert.equal(report.sceneValidationReportVersion, 1);
  assert.equal(typeof report.scene, 'string');
  assert.equal(typeof report.valid, 'boolean');
  assert.equal(Array.isArray(report.errors), true);
  assert.equal(Array.isArray(report.warnings), true);
  assert.equal(Array.isArray(report.systems), true);

  for (const issue of [...report.errors, ...report.warnings]) {
    const keys = Object.keys(issue).sort();
    assert.equal(typeof issue.code, 'string');
    assert.equal(issue.code.length > 0, true);
    assert.equal(typeof issue.message, 'string');
    assert.equal(issue.message.length > 0, true);
    assert.equal(keys.includes('path') ? typeof issue.path === 'string' : true, true);
    assert.equal(keys.includes('system') ? typeof issue.system === 'string' : true, true);
    assert.deepEqual(keys, ISSUE_KEYS.filter((key) => keys.includes(key)));
  }

  for (const system of report.systems) {
    const keys = Object.keys(system).sort();
    assert.equal(typeof system.name, 'string');
    assert.equal(typeof system.known, 'boolean');
    assert.deepEqual(keys, SYSTEM_KEYS.filter((key) => keys.includes(key)));

    const registrySystem = knownSystems.get(system.name);
    if (system.known) {
      assert.notEqual(registrySystem, undefined);
      assert.equal(system.delta, registrySystem.delta);
      assert.equal(system.deterministic, registrySystem.deterministic);
    } else {
      assert.equal(system.delta, undefined);
      assert.equal(system.deterministic, undefined);
    }
  }
}

