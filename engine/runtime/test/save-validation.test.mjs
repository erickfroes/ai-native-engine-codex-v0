import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateSaveFile } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function saveFixturePath(relativePath) {
  return path.join(repoRoot, 'fixtures', 'savegame', relativePath);
}

test('validates versioned save fixture successfully', async () => {
  const report = await validateSaveFile(saveFixturePath('valid.savegame.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
});

test('reports predictable error when required save field is missing', async () => {
  const report = await validateSaveFile(saveFixturePath('invalid.missing-checksum.savegame.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.checksum' && error.message === 'is required'));
});

test('reports predictable error when saveVersion is unsupported', async () => {
  const report = await validateSaveFile(saveFixturePath('invalid.unsupported-version.savegame.json'));

  assert.equal(report.ok, false);
  assert.ok(
    report.errors.some(
      (error) => error.path === '$.saveVersion' && error.message === 'unsupported saveVersion: 2; supported: 1'
    )
  );
});
