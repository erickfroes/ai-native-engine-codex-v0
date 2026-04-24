import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['assetRefs', 'entities', 'metadata', 'systems', 'version']);
const ENTITY_KEYS = Object.freeze(['components', 'id', 'name', 'prefab']);

export function assertSceneDocumentV1(sceneDocument) {
  assert.equal(typeof sceneDocument, 'object');
  assert.notEqual(sceneDocument, null);

  const keys = Object.keys(sceneDocument).sort();
  assert.deepEqual(keys, ROOT_KEYS.filter((key) => keys.includes(key)));
  assert.equal(Number.isInteger(sceneDocument.version), true);
  assert.equal(sceneDocument.version >= 1, true);

  assert.equal(typeof sceneDocument.metadata, 'object');
  assert.notEqual(sceneDocument.metadata, null);
  assert.equal(typeof sceneDocument.metadata.name, 'string');
  assert.equal(sceneDocument.metadata.name.trim().length > 0, true);

  assert.equal(Array.isArray(sceneDocument.systems), true);
  assert.equal(sceneDocument.systems.length > 0, true);
  for (const systemName of sceneDocument.systems) {
    assert.equal(typeof systemName, 'string');
    assert.equal(systemName.trim().length > 0, true);
  }

  assert.equal(Array.isArray(sceneDocument.entities), true);
  for (const entity of sceneDocument.entities) {
    assert.equal(typeof entity, 'object');
    assert.notEqual(entity, null);
    const entityKeys = Object.keys(entity).sort();
    assert.deepEqual(entityKeys, ENTITY_KEYS.filter((key) => entityKeys.includes(key)));
    assert.equal(typeof entity.id, 'string');
    assert.equal(Array.isArray(entity.components), true);
  }

  if (sceneDocument.assetRefs !== undefined) {
    assert.equal(Array.isArray(sceneDocument.assetRefs), true);
    for (const assetRef of sceneDocument.assetRefs) {
      assert.equal(typeof assetRef, 'string');
    }
  }
}

export function assertSceneDocumentV1Rejects(sceneDocument) {
  assert.throws(() => assertSceneDocumentV1(sceneDocument));
}

