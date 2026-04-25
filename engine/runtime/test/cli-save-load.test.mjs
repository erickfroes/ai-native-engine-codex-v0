import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { canonicalJSONStringify } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const movementScenePath = path.join(repoRoot, 'scenes', 'state', 'movement.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

async function createTempSaveDir(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cli-save-load-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('save-state fails predictably when --out is missing', () => {
  const result = runCli([
    'save-state',
    movementScenePath,
    '--ticks',
    '3',
    '--seed',
    '10'
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /save-state: --out is required/);
});

test('save-state writes deterministic envelope paths and load-save returns loaded snapshot', async (t) => {
  const outDir = await createTempSaveDir(t);

  const saveResult = runCli([
    'save-state',
    movementScenePath,
    '--ticks',
    '3',
    '--seed',
    '10',
    '--out',
    outDir,
    '--json'
  ]);

  assert.equal(saveResult.status, 0, saveResult.stderr);

  const saveJson = JSON.parse(saveResult.stdout);
  assert.deepEqual(Object.keys(saveJson).sort(), ['payloadPath', 'save', 'savePath']);
  assert.equal(saveJson.save.saveVersion, 1);
  assert.equal(saveJson.save.contentVersion, 1);
  assert.equal(saveJson.save.seed, 10);
  assert.equal(saveJson.save.payloadRef, 'state-snapshot-v1.payload.json');

  const rawSave = await readFile(saveJson.savePath, 'utf8');
  const rawPayload = await readFile(saveJson.payloadPath, 'utf8');
  assert.equal(rawSave, `${canonicalJSONStringify(JSON.parse(rawSave))}\n`);
  assert.equal(rawPayload, `${canonicalJSONStringify(JSON.parse(rawPayload))}\n`);
  assert.match(rawSave, /sha256:[a-f0-9]{64}/);

  const loadResult = runCli(['load-save', saveJson.savePath, '--json']);
  assert.equal(loadResult.status, 0, loadResult.stderr);

  const loadJson = JSON.parse(loadResult.stdout);
  assert.deepEqual(Object.keys(loadJson).sort(), ['payloadPath', 'save', 'savePath', 'snapshot']);
  assert.equal(loadJson.save.checksum, saveJson.save.checksum);
  assert.equal(loadJson.snapshot.stateSnapshotVersion, 1);
  assert.equal(loadJson.snapshot.scene, 'movement');
  assert.equal(loadJson.snapshot.tick, 3);
  assert.equal(loadJson.snapshot.entities[0].components.transform.fields.x, 6);
  assert.equal(loadJson.snapshot.entities[0].components.transform.fields.y, 9);
});

test('load-save fails predictably when payload checksum diverges', async (t) => {
  const outDir = await createTempSaveDir(t);
  const saveResult = runCli([
    'save-state',
    movementScenePath,
    '--ticks',
    '3',
    '--seed',
    '10',
    '--out',
    outDir,
    '--json'
  ]);

  assert.equal(saveResult.status, 0, saveResult.stderr);
  const saveJson = JSON.parse(saveResult.stdout);
  const payload = JSON.parse(await readFile(saveJson.payloadPath, 'utf8'));

  payload.tick = 4;
  await writeFile(saveJson.payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const loadResult = runCli(['load-save', saveJson.savePath, '--json']);
  assert.notEqual(loadResult.status, 0);
  assert.match(loadResult.stderr, /save payload checksum mismatch/);
});

test('load-save fails predictably when save path does not exist', async (t) => {
  const outDir = await createTempSaveDir(t);
  const missingSavePath = path.join(outDir, 'missing.savegame.json');
  const loadResult = runCli(['load-save', missingSavePath, '--json']);

  assert.notEqual(loadResult.status, 0);
  assert.match(loadResult.stderr, /ENOENT/);
});

test('load-save fails predictably when payload JSON is malformed', async (t) => {
  const outDir = await createTempSaveDir(t);
  const saveResult = runCli([
    'save-state',
    movementScenePath,
    '--ticks',
    '3',
    '--seed',
    '10',
    '--out',
    outDir,
    '--json'
  ]);

  assert.equal(saveResult.status, 0, saveResult.stderr);
  const saveJson = JSON.parse(saveResult.stdout);

  await writeFile(saveJson.payloadPath, '{"stateSnapshotVersion": 1,\n', 'utf8');

  const loadResult = runCli(['load-save', saveJson.savePath, '--json']);
  assert.notEqual(loadResult.status, 0);
  assert.match(loadResult.stderr, /failed to read state snapshot payload/);
});

test('load-save fails predictably when payloadRef escapes the save directory', async (t) => {
  const outDir = await createTempSaveDir(t);
  const saveResult = runCli([
    'save-state',
    movementScenePath,
    '--ticks',
    '3',
    '--seed',
    '10',
    '--out',
    outDir,
    '--json'
  ]);

  assert.equal(saveResult.status, 0, saveResult.stderr);
  const saveJson = JSON.parse(saveResult.stdout);
  const envelope = JSON.parse(await readFile(saveJson.savePath, 'utf8'));

  await writeFile(
    saveJson.savePath,
    `${canonicalJSONStringify({
      ...envelope,
      payloadRef: '../outside.payload.json'
    })}\n`,
    'utf8'
  );

  const loadResult = runCli(['load-save', saveJson.savePath, '--json']);
  assert.notEqual(loadResult.status, 0);
  assert.match(loadResult.stderr, /unsafe payloadRef: \.\.\/outside\.payload\.json/);
});
