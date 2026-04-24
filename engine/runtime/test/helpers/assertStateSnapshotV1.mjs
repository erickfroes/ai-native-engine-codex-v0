import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['entities', 'scene', 'seed', 'stateSnapshotVersion', 'tick']);
const ENTITY_KEYS = Object.freeze(['components', 'id', 'name']);

export function assertStateSnapshotV1(snapshot) {
  assert.equal(typeof snapshot, 'object');
  assert.notEqual(snapshot, null);

  const keys = Object.keys(snapshot).sort();
  assert.deepEqual(keys, ROOT_KEYS.filter((key) => keys.includes(key)));

  assert.equal(snapshot.stateSnapshotVersion, 1);
  assert.equal(typeof snapshot.scene, 'string');
  assert.equal(Number.isInteger(snapshot.seed), true);
  assert.equal(Number.isInteger(snapshot.tick), true);
  assert.equal(Array.isArray(snapshot.entities), true);

  for (const entity of snapshot.entities) {
    assert.equal(typeof entity, 'object');
    assert.notEqual(entity, null);
    const entityKeys = Object.keys(entity).sort();
    assert.deepEqual(entityKeys, ENTITY_KEYS.filter((key) => entityKeys.includes(key)));
    assert.equal(typeof entity.id, 'string');
    assert.equal(typeof entity.components, 'object');
    assert.notEqual(entity.components, null);

    const componentEntries = Object.entries(entity.components);
    for (const [componentName, componentValue] of componentEntries) {
      assert.equal(typeof componentName, 'string');
      assert.equal(componentName.length > 0, true);
      assert.equal(typeof componentValue, 'object');
      assert.notEqual(componentValue, null);
    }
  }
}
