import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  canonicalJSONStringify,
  createSha256Checksum,
  loadStateSnapshotSaveV1,
  saveStateSnapshotV1,
  validateSaveFile
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function saveFixturePath(relativePath) {
  return path.join(repoRoot, 'fixtures', 'savegame', relativePath);
}

function createSnapshotFixture() {
  return {
    tick: 3,
    entities: [
      {
        components: {
          velocity: {
            version: 1,
            replicated: false,
            fields: {
              y: 0,
              x: 1
            }
          },
          transform: {
            version: 1,
            replicated: true,
            fields: {
              position: {
                z: 0,
                y: 2,
                x: 1
              }
            }
          }
        },
        name: 'Hero',
        id: 'player.hero'
      }
    ],
    seed: 11,
    scene: 'tutorial',
    stateSnapshotVersion: 1
  };
}

async function createTempSaveDir(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'runtime-save-state-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('validates versioned save fixture successfully', async () => {
  const report = await validateSaveFile(saveFixturePath('valid.savegame.json'));

  assert.equal(report.reportVersion, 1);
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
});

test('validates legacy v0 save fixture via minimal migration', async () => {
  const report = await validateSaveFile(saveFixturePath('legacy.v0.savegame.json'));

  assert.equal(report.reportVersion, 1);
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.save.saveVersion, 1);
  assert.equal(report.save.contentVersion, 1);
  assert.equal(report.save.seed, 42);
  assert.equal(report.save.checksum, 'sha256:dummy-checksum-v0');
  assert.equal(report.save.payloadRef, 'saves/tutorial/slot-legacy-v0.payload.json');
});

test('reports predictable error when required save field is missing', async () => {
  const report = await validateSaveFile(saveFixturePath('invalid.missing-checksum.savegame.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.checksum' && error.message === 'is required'));
});

test('reports predictable error when saveVersion is unsupported', async () => {
  const report = await validateSaveFile(saveFixturePath('invalid.unsupported-version.savegame.json'));

  assert.equal(report.reportVersion, 1);
  assert.equal(report.ok, false);
  assert.ok(
    report.errors.some(
      (error) => error.path === '$.saveVersion' && error.message === 'unsupported saveVersion: 2; supported: 1'
    )
  );
});

test('canonical JSON helper sorts nested object keys and produces stable sha256 checksum', () => {
  const input = {
    z: 1,
    a: {
      d: 4,
      c: 3
    },
    arr: [
      {
        y: 2,
        x: 1
      },
      0
    ]
  };

  const expectedCanonicalJson = '{"a":{"c":3,"d":4},"arr":[{"x":1,"y":2},0],"z":1}';
  const expectedChecksum = `sha256:${createHash('sha256').update(expectedCanonicalJson).digest('hex')}`;

  assert.equal(canonicalJSONStringify(input), expectedCanonicalJson);
  assert.equal(createSha256Checksum(input), expectedChecksum);
  assert.equal(
    canonicalJSONStringify({
      arr: [
        {
          x: 1,
          y: 2
        },
        0
      ],
      a: {
        c: 3,
        d: 4
      },
      z: 1
    }),
    expectedCanonicalJson
  );
});

test('saveStateSnapshotV1 writes deterministic files and loadStateSnapshotSaveV1 returns validated envelope plus snapshot', async (t) => {
  const outDir = await createTempSaveDir(t);
  const snapshot = createSnapshotFixture();

  const saved = await saveStateSnapshotV1({
    snapshot,
    outDir,
    seed: snapshot.seed,
    contentVersion: 7
  });

  assert.equal(path.dirname(saved.savePath), outDir);
  assert.equal(path.dirname(saved.payloadPath), outDir);

  const rawPayload = await readFile(saved.payloadPath, 'utf8');
  const rawSave = await readFile(saved.savePath, 'utf8');

  assert.equal(rawPayload, `${canonicalJSONStringify(snapshot)}\n`);
  assert.equal(rawSave, `${canonicalJSONStringify(saved.envelope)}\n`);
  assert.equal(saved.envelope.checksum, createSha256Checksum(snapshot));
  assert.equal(saved.envelope.payloadRef, 'state-snapshot-v1.payload.json');

  const loaded = await loadStateSnapshotSaveV1(saved.savePath);

  assert.deepEqual(loaded.envelope, saved.envelope);
  assert.deepEqual(loaded.snapshot, snapshot);
  assert.equal(loaded.savePath, saved.savePath);
  assert.equal(loaded.payloadPath, saved.payloadPath);
});

test('loadStateSnapshotSaveV1 fails predictably when payload checksum does not match envelope', async (t) => {
  const outDir = await createTempSaveDir(t);
  const snapshot = createSnapshotFixture();
  const saved = await saveStateSnapshotV1({
    snapshot,
    outDir,
    contentVersion: 3
  });

  const tamperedSnapshot = {
    ...snapshot,
    tick: snapshot.tick + 1
  };

  await writeFile(saved.payloadPath, `${canonicalJSONStringify(tamperedSnapshot)}\n`, 'utf8');

  await assert.rejects(
    loadStateSnapshotSaveV1(saved.savePath),
    /save payload checksum mismatch: expected sha256:[a-f0-9]+, computed sha256:[a-f0-9]+/
  );
});

test('loadStateSnapshotSaveV1 rejects payloadRef traversal before reading payload', async (t) => {
  const outDir = await createTempSaveDir(t);
  const snapshot = createSnapshotFixture();
  const saved = await saveStateSnapshotV1({
    snapshot,
    outDir,
    contentVersion: 5
  });

  await writeFile(
    saved.savePath,
    `${canonicalJSONStringify({
      ...saved.envelope,
      payloadRef: '../outside.payload.json'
    })}\n`,
    'utf8'
  );

  await assert.rejects(loadStateSnapshotSaveV1(saved.savePath), /unsafe payloadRef: \.\.\/outside\.payload\.json/);
});

test('validateSaveFile and loadStateSnapshotSaveV1 fail predictably when payloadRef is missing', async (t) => {
  const outDir = await createTempSaveDir(t);
  const snapshot = createSnapshotFixture();
  const saved = await saveStateSnapshotV1({
    snapshot,
    outDir,
    contentVersion: 2
  });
  const { payloadRef: _payloadRef, ...envelopeWithoutPayloadRef } = saved.envelope;

  await writeFile(saved.savePath, `${canonicalJSONStringify(envelopeWithoutPayloadRef)}\n`, 'utf8');

  const report = await validateSaveFile(saved.savePath);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.payloadRef' && error.message === 'is required'));

  await assert.rejects(loadStateSnapshotSaveV1(saved.savePath), /invalid save file: \$\.payloadRef: is required/);
});

test('loadStateSnapshotSaveV1 fails predictably for known invalid savegame fixture', async () => {
  const invalidSavePath = saveFixturePath('invalid.missing-checksum.savegame.json');
  const report = await validateSaveFile(invalidSavePath);

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.checksum' && error.message === 'is required'));
  await assert.rejects(loadStateSnapshotSaveV1(invalidSavePath), /invalid save file: \$\.checksum: is required/);
});

test('loadStateSnapshotSaveV1 fails predictably when payload JSON is malformed', async (t) => {
  const outDir = await createTempSaveDir(t);
  const snapshot = createSnapshotFixture();
  const saved = await saveStateSnapshotV1({
    snapshot,
    outDir,
    contentVersion: 4
  });

  await writeFile(saved.payloadPath, '{"stateSnapshotVersion": 1,\n', 'utf8');

  await assert.rejects(
    loadStateSnapshotSaveV1(saved.savePath),
    (error) => {
      assert.match(error.message, /failed to read state snapshot payload:/);
      assert.equal(error.cause instanceof SyntaxError, true);
      return true;
    }
  );
});
