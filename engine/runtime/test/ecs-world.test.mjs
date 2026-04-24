import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadWorldFromSceneFile,
  summarizeWorld
} from '../src/ecs/world.mjs';

test('loads and summarizes ECS world from tutorial scene', async () => {
  const world = await loadWorldFromSceneFile('./scenes/tutorial.scene.json');
  const summary = summarizeWorld(world);

  assert.equal(summary.sceneName, 'tutorial');
  assert.equal(summary.entityCount, 2);
  assert.equal(summary.componentCount, 5);
  assert.deepEqual(summary.componentKinds, ['camera', 'health', 'sprite', 'transform']);
});

test('summarizes world with component-kind filter', async () => {
  const world = await loadWorldFromSceneFile('./scenes/tutorial.scene.json');
  const summary = summarizeWorld(world, { componentKind: 'health' });

  assert.equal(summary.componentKindFilter, 'health');
  assert.equal(summary.entityCount, 1);
  assert.equal(summary.componentCount, 1);
  assert.deepEqual(summary.componentKinds, ['health']);
  assert.equal(summary.entities[0].id, 'player.hero');
});

test('summarizes world with system-name filter', async () => {
  const world = await loadWorldFromSceneFile('./scenes/tutorial.scene.json');
  const matched = summarizeWorld(world, { systemName: 'networking.replication' });
  const unmatched = summarizeWorld(world, { systemName: 'ui.runtime' });

  assert.equal(matched.systemNameFilter, 'networking.replication');
  assert.equal(matched.entityCount, 2);
  assert.equal(unmatched.systemNameFilter, 'ui.runtime');
  assert.equal(unmatched.entityCount, 0);
});
