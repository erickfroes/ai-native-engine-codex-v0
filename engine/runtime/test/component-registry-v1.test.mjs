import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getComponentRegistryV1,
  listKnownComponents,
  getKnownComponent,
  isKnownComponent
} from '../src/index.mjs';
import { assertComponentRegistryV1 } from './helpers/assertComponentRegistryV1.mjs';

test('Component Registry v1 has stable known components and lookup APIs', () => {
  const registry = getComponentRegistryV1();
  assertComponentRegistryV1(registry);

  assert.deepEqual(listKnownComponents(), ['transform', 'velocity']);
  assert.equal(isKnownComponent('transform'), true);
  assert.equal(isKnownComponent('velocity'), true);
  assert.equal(isKnownComponent('unknown'), false);

  const transform = getKnownComponent('transform');
  assert.equal(transform?.name, 'transform');
  assert.equal(transform?.version, 1);

  const missing = getKnownComponent('missing.component');
  assert.equal(missing, null);
});
