import test from 'node:test';
import assert from 'node:assert/strict';

import {
  inspectSceneHierarchyFile,
  formatSceneHierarchyReport
} from '../src/ecs/scene-hierarchy.mjs';

test('builds deterministic scene hierarchy from entity ids', async () => {
  const report = await inspectSceneHierarchyFile('./scenes/tutorial.scene.json');

  assert.equal(report.sceneName, 'tutorial');
  assert.equal(report.entityCount, 2);
  assert.equal(report.nodeCount, 4);
  assert.equal(report.leafCount, 2);
  assert.equal(report.roots.length, 2);
  assert.equal(report.roots[0].path, 'camera');
  assert.equal(report.roots[1].path, 'player');
  assert.equal(report.roots[0].children[0].entity.id, 'camera.main');
  assert.equal(report.roots[1].children[0].entity.id, 'player.hero');
});

test('filters hierarchy by component kind', async () => {
  const report = await inspectSceneHierarchyFile('./scenes/tutorial.scene.json', {
    componentKind: 'health'
  });

  assert.equal(report.componentKindFilter, 'health');
  assert.equal(report.entityCount, 1);
  assert.equal(report.roots.length, 1);
  assert.equal(report.roots[0].path, 'player');
  assert.equal(report.roots[0].children[0].entity.id, 'player.hero');
  assert.deepEqual(report.roots[0].children[0].entity.componentKinds, ['health']);
});

test('filters hierarchy by system name', async () => {
  const matched = await inspectSceneHierarchyFile('./scenes/tutorial.scene.json', {
    systemName: 'networking.replication'
  });
  const unmatched = await inspectSceneHierarchyFile('./scenes/tutorial.scene.json', {
    systemName: 'ui.runtime'
  });

  assert.equal(matched.systemNameFilter, 'networking.replication');
  assert.equal(matched.entityCount, 2);
  assert.equal(unmatched.systemNameFilter, 'ui.runtime');
  assert.equal(unmatched.entityCount, 0);
  assert.equal(unmatched.roots.length, 0);
});

test('formats hierarchy report with scene metadata', () => {
  const text = formatSceneHierarchyReport({
    sceneName: 'tutorial',
    entityCount: 1,
    nodeCount: 2,
    leafCount: 1,
    roots: [
      {
        path: 'player',
        segment: 'player',
        entity: null,
        children: [
          {
            path: 'player.hero',
            segment: 'hero',
            children: [],
            entity: {
              id: 'player.hero',
              componentKinds: ['transform']
            }
          }
        ]
      }
    ]
  });

  assert.match(text, /Scene: tutorial/);
  assert.match(text, /Hierarchy nodes: 2/);
  assert.match(text, /player\.hero/);
});
