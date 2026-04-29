import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures');
const emptyScenePath = path.join(fixtureDir, 'audio-lite-empty.scene.json');
const sfxScenePath = path.join(fixtureDir, 'audio-lite-sfx.scene.json');
const musicScenePath = path.join(fixtureDir, 'audio-lite-music-loop.scene.json');
const invalidScenePath = path.join(fixtureDir, 'invalid_audio_lite_trigger.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-audio-lite returns deterministic AudioLiteReport v1 JSON', () => {
  const first = runCli(['inspect-audio-lite', sfxScenePath, '--json']);
  const second = runCli(['inspect-audio-lite', sfxScenePath, '--json']);

  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.equal(first.stdout, second.stdout);

  const report = JSON.parse(first.stdout);
  assert.equal(report.audioLiteReportVersion, 1);
  assert.equal(report.scene, 'audio-lite-sfx-fixture');
  assert.deepEqual(report.clips.map((clip) => clip.clipId), ['sfx.step']);
  assert.deepEqual(report.triggers, [
    {
      trigger: 'onMove',
      clipIds: ['sfx.step']
    }
  ]);
  assert.equal(report.warnings[0].code, 'AUDIO_CLIP_SRC_MISSING');
});

test('inspect-audio-lite returns empty reports for scenes without audio.clip', () => {
  const result = runCli(['inspect-audio-lite', emptyScenePath, '--json']);

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    audioLiteReportVersion: 1,
    scene: 'audio-lite-empty-fixture',
    clips: [],
    triggers: [],
    warnings: [],
    invalidRefs: []
  });
});

test('inspect-audio-lite reports missing source references without failing valid scenes', () => {
  const result = runCli(['inspect-audio-lite', musicScenePath, '--json']);

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.clips[0].kind, 'music');
  assert.equal(report.clips[0].loop, true);
  assert.deepEqual(report.invalidRefs, [
    {
      entityId: 'audio.music',
      clipId: 'music.theme',
      src: 'audio/missing-theme.ogg',
      reason: 'AUDIO_CLIP_SRC_NOT_FOUND'
    }
  ]);
});

test('inspect-audio-lite prints stable readable output without --json', () => {
  const result = runCli(['inspect-audio-lite', sfxScenePath]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Scene: audio-lite-sfx-fixture/);
  assert.match(result.stdout, /Audio Lite report version: 1/);
  assert.match(result.stdout, /Clips: 1/);
  assert.match(result.stdout, /- sfx\.step: entity=audio\.step kind=sfx trigger=onMove volume=0\.75 loop=false src=\(none\)/);
});

test('inspect-audio-lite fails predictably for invalid audio scenes', () => {
  const result = runCli(['inspect-audio-lite', invalidScenePath, '--json']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Scene validation failed for .*invalid_audio_lite_trigger\.scene\.json/);
});
