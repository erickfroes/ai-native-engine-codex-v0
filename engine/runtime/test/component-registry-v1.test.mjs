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

  assert.deepEqual(listKnownComponents(), ['transform', 'velocity', 'visual.sprite', 'tile.layer', 'camera.viewport']);
  assert.equal(isKnownComponent('transform'), true);
  assert.equal(isKnownComponent('velocity'), true);
  assert.equal(isKnownComponent('visual.sprite'), true);
  assert.equal(isKnownComponent('tile.layer'), true);
  assert.equal(isKnownComponent('camera.viewport'), true);
  assert.equal(isKnownComponent('unknown'), false);

  const transform = getKnownComponent('transform');
  assert.equal(transform?.name, 'transform');
  assert.equal(transform?.version, 1);

  const visualSprite = getKnownComponent('visual.sprite');
  assert.equal(visualSprite?.name, 'visual.sprite');
  assert.equal(visualSprite?.version, 1);

  const tileLayer = getKnownComponent('tile.layer');
  assert.equal(tileLayer?.name, 'tile.layer');
  assert.equal(tileLayer?.version, 1);

  const cameraViewport = getKnownComponent('camera.viewport');
  assert.equal(cameraViewport?.name, 'camera.viewport');
  assert.equal(cameraViewport?.version, 1);

  const missing = getKnownComponent('missing.component');
  assert.equal(missing, null);
});
