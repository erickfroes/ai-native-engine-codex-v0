import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getStateProcessorRegistryV1,
  listStateProcessors,
  getStateProcessor
} from '../src/index.mjs';
import { assertStateProcessorRegistryV1 } from './helpers/assertStateProcessorRegistryV1.mjs';

test('State Processor Registry v1 exposes movement.integrate metadata and stable lookups', () => {
  const registry = getStateProcessorRegistryV1();
  assertStateProcessorRegistryV1(registry);

  assert.deepEqual(listStateProcessors(), ['movement.integrate']);
  const movement = getStateProcessor('movement.integrate');
  assert.equal(movement?.name, 'movement.integrate');
  assert.equal(movement?.deterministic, true);
  assert.deepEqual(movement?.requiredComponents, ['transform', 'velocity']);

  assert.equal(getStateProcessor('missing.processor'), null);
});
