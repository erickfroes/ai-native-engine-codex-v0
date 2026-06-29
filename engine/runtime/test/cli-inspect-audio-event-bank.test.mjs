import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const validManifestPath = path.join(repoRoot, 'scenes', 'audio-game-feedback.audio-event-bank.json');
const invalidManifestPath = path.join(
  repoRoot,
  'scenes',
  'audio-game-feedback.invalid-missing-clip.audio-event-bank.json'
);

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-audio-event-bank returns deterministic JSON for the public audio scene', () => {
  const first = runCli(['inspect-audio-event-bank', validManifestPath, '--json']);
  const second = runCli(['inspect-audio-event-bank', validManifestPath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);

  const report = JSON.parse(first.stdout);
  assert.equal(report.audioEventBankReportVersion, 1);
  assert.equal(report.scene, 'audio-game-feedback');
  assert.equal(report.summary.bankCount, 2);
  assert.equal(report.summary.eventCount, 6);
});

test('inspect-audio-event-bank prints readable output without --json', () => {
  const result = runCli(['inspect-audio-event-bank', validManifestPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Audio event bank report version: 1/);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /Scene: audio-game-feedback/);
  assert.match(result.stdout, /- gameplay: 3 event\(s\)/);
  assert.match(result.stdout, /- menu: 3 event\(s\)/);
});

test('inspect-audio-event-bank returns report JSON and exit code 1 for invalid manifests', () => {
  const result = runCli(['inspect-audio-event-bank', invalidManifestPath, '--json']);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.match(report.errors[0].message, /referenced scene clipId not found: sfx\.missing\.clip/);
});
