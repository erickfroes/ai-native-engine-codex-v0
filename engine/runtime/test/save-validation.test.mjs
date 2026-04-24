import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateSaveFile } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('validates tutorial save successfully', async () => {
  const report = await validateSaveFile(scenePath('tutorial.save.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.save.world.scene, 'tutorial');
});
