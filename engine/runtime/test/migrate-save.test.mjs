import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { migrateLegacySaveEnvelope } from '../src/save/migrate-save.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

async function loadSaveFixture(fileName) {
  const fixturePath = path.join(repoRoot, 'fixtures', 'savegame', fileName);
  const raw = await readFile(fixturePath, 'utf8');
  return JSON.parse(raw);
}

test('migrates saveVersion 0 to 1 and preserves save envelope fields', async () => {
  const legacySave = await loadSaveFixture('legacy.v0.savegame.json');
  const originalCopy = structuredClone(legacySave);

  const migrated = migrateLegacySaveEnvelope(legacySave);

  assert.equal(migrated.saveVersion, 1);
  assert.equal(migrated.contentVersion, legacySave.contentVersion);
  assert.equal(migrated.seed, legacySave.seed);
  assert.equal(migrated.checksum, legacySave.checksum);
  assert.equal(migrated.payloadRef, legacySave.payloadRef);
  assert.deepEqual(legacySave, originalCopy);
});

test('does not migrate versions outside the explicit rule', async () => {
  const supportedSave = await loadSaveFixture('valid.savegame.json');
  const unsupportedSave = await loadSaveFixture('invalid.unsupported-version.savegame.json');

  assert.strictEqual(migrateLegacySaveEnvelope(supportedSave), supportedSave);
  assert.strictEqual(migrateLegacySaveEnvelope(unsupportedSave), unsupportedSave);
  assert.equal(migrateLegacySaveEnvelope(supportedSave).saveVersion, 1);
  assert.equal(migrateLegacySaveEnvelope(unsupportedSave).saveVersion, 2);
});
