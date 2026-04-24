import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runFirstSystemLoop } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('first system loop applies deterministic health decay', async () => {
  const report = await runFirstSystemLoop(scenePath('tutorial.scene.json'), 3);

  assert.equal(report.sceneName, 'tutorial');
  assert.equal(report.ticks, 3);
  assert.equal(report.affectedEntities, 1);
  assert.equal(report.healthByEntity['player.hero'], 97);
});
