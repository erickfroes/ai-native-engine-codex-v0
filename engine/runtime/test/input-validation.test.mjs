import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateInputBindingsFile } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('validates tutorial input bindings successfully', async () => {
  const report = await validateInputBindingsFile(scenePath('tutorial.input.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.bindings.actions.length, 3);
});
