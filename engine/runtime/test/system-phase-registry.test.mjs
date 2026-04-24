import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSystemPhaseRegistryV1,
  getSystemPhase,
  getKnownSystemPhase,
  listSystemPhases,
  assertSystemHasPhase,
  assertPhaseRegistryIntegrity
} from '../src/index.mjs';
import { assertSystemPhaseRegistryV1 } from './helpers/assertSystemPhaseRegistryV1.mjs';

test('system phase registry v1 has expected shape and mappings', () => {
  const registry = getSystemPhaseRegistryV1();
  assertSystemPhaseRegistryV1(registry);
});

test('system phase lookup helpers return expected values', () => {
  assert.equal(getSystemPhase('core.loop'), 'core');
  assert.equal(getSystemPhase('input.keyboard'), 'input');
  assert.equal(getSystemPhase('networking.replication'), 'networking');
  assert.equal(getSystemPhase('unknown.system'), undefined);

  assert.equal(getKnownSystemPhase('core.loop'), 'core');
  assert.equal(getKnownSystemPhase('unknown.system'), undefined);
  assert.equal(assertSystemHasPhase('core.loop'), 'core');
  assert.throws(() => assertSystemHasPhase('unknown.system'), /missing phase for known system/);
});

test('phase listing and integrity assertion are deterministic', () => {
  const first = listSystemPhases();
  const second = listSystemPhases();
  assert.deepEqual(first, second);
  assertPhaseRegistryIntegrity();
});

