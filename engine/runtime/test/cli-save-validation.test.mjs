import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const validSavePath = path.join(repoRoot, 'fixtures', 'savegame', 'valid.savegame.json');
const invalidSavePath = path.join(repoRoot, 'fixtures', 'savegame', 'invalid.missing-checksum.savegame.json');
const unsupportedVersionSavePath = path.join(
  repoRoot,
  'fixtures',
  'savegame',
  'invalid.unsupported-version.savegame.json'
);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('validate-save --json returns stable report for valid fixture', () => {
  const first = runCli(['validate-save', validSavePath, '--json']);
  const second = runCli(['validate-save', validSavePath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);

  assert.equal(firstReport.ok, true);
  assert.equal(firstReport.errors.length, 0);
  assert.deepEqual(firstReport, secondReport);
});

test('validate-save fails predictably for invalid fixture in --json mode', () => {
  const result = runCli(['validate-save', invalidSavePath, '--json']);

  assert.equal(result.status, 1, result.stderr);

  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.checksum' && error.message === 'is required'));
});

test('validate-save prints readable status in default mode', () => {
  const result = runCli(['validate-save', invalidSavePath]);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /\$\.checksum: is required/);
});

test('validate-save fails predictably for unsupported saveVersion', () => {
  const result = runCli(['validate-save', unsupportedVersionSavePath]);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /\$\.saveVersion: unsupported saveVersion: 2; supported: 1/);
});
