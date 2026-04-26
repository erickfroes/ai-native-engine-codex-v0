import assert from 'node:assert/strict';

const ROOT_KEYS = Object.freeze(['drawCalls', 'renderSnapshotVersion', 'scene', 'tick', 'viewport']);
const VIEWPORT_KEYS = Object.freeze(['height', 'width']);
const RECT_DRAW_CALL_KEYS = Object.freeze(['height', 'id', 'kind', 'layer', 'width', 'x', 'y']);
const SPRITE_DRAW_CALL_KEYS = Object.freeze(['assetId', 'height', 'id', 'kind', 'layer', 'width', 'x', 'y']);

export function assertRenderSnapshotV1(snapshot) {
  assert.equal(typeof snapshot, 'object');
  assert.notEqual(snapshot, null);
  assert.deepEqual(Object.keys(snapshot).sort(), ROOT_KEYS);
  assert.equal(snapshot.renderSnapshotVersion, 1);
  assert.equal(typeof snapshot.scene, 'string');
  assert.equal(snapshot.scene.trim().length > 0, true);
  assert.equal(Number.isInteger(snapshot.tick), true);
  assert.equal(snapshot.tick >= 0, true);

  assert.equal(typeof snapshot.viewport, 'object');
  assert.notEqual(snapshot.viewport, null);
  assert.deepEqual(Object.keys(snapshot.viewport).sort(), VIEWPORT_KEYS);
  assert.equal(Number.isInteger(snapshot.viewport.width), true);
  assert.equal(snapshot.viewport.width >= 1, true);
  assert.equal(Number.isInteger(snapshot.viewport.height), true);
  assert.equal(snapshot.viewport.height >= 1, true);

  assert.equal(Array.isArray(snapshot.drawCalls), true);
  for (const drawCall of snapshot.drawCalls) {
    assert.equal(typeof drawCall, 'object');
    assert.notEqual(drawCall, null);
    if (drawCall.kind === 'rect') {
      assert.deepEqual(Object.keys(drawCall).sort(), RECT_DRAW_CALL_KEYS);
    } else if (drawCall.kind === 'sprite') {
      assert.deepEqual(Object.keys(drawCall).sort(), SPRITE_DRAW_CALL_KEYS);
      assert.equal(typeof drawCall.assetId, 'string');
      assert.equal(drawCall.assetId.trim().length > 0, true);
    } else {
      assert.fail(`unexpected drawCall.kind: ${drawCall.kind}`);
    }
    assert.equal(typeof drawCall.id, 'string');
    assert.equal(drawCall.id.trim().length > 0, true);
    assert.equal(Number.isInteger(drawCall.x), true);
    assert.equal(Number.isInteger(drawCall.y), true);
    assert.equal(Number.isInteger(drawCall.width), true);
    assert.equal(drawCall.width >= 1, true);
    assert.equal(Number.isInteger(drawCall.height), true);
    assert.equal(drawCall.height >= 1, true);
    assert.equal(Number.isInteger(drawCall.layer), true);
  }
}

export function assertRenderSnapshotV1Rejects(snapshot) {
  assert.throws(() => assertRenderSnapshotV1(snapshot));
}
