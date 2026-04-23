import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, buildWorldSnapshotMessage, validateNetMessageContract } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('builds a deterministic world.snapshot message from replicated components', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));

  const message = buildWorldSnapshotMessage(scene, { tick: 1 });

  assert.deepEqual(message, {
    opcode: 'world.snapshot',
    version: 1,
    direction: 'server_to_client',
    reliability: 'unreliable',
    payload: {
      tick: 1,
      entities: [
        {
          id: 'player.hero',
          components: [
            {
              kind: 'health',
              version: 1,
              fields: {
                current: 100,
                max: 100
              }
            },
            {
              kind: 'transform',
              version: 1,
              fields: {
                position: {
                  x: 0,
                  y: 0,
                  z: 0
                }
              }
            }
          ]
        }
      ]
    }
  });

  const errors = await validateNetMessageContract(message);
  assert.equal(errors.length, 0);
});
