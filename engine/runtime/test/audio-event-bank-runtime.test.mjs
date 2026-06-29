import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAudioEventBankReportV1 } from '../src/index.mjs';
import { assertAudioEventBankReportV1 } from './helpers/assertAudioEventBankReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const validManifestPath = path.join(repoRoot, 'scenes', 'audio-game-feedback.audio-event-bank.json');
const invalidMissingClipManifestPath = path.join(
  repoRoot,
  'scenes',
  'audio-game-feedback.invalid-missing-clip.audio-event-bank.json'
);
const missingManifestPath = path.join(repoRoot, 'scenes', 'does-not-exist.audio-event-bank.json');

test('buildAudioEventBankReportV1 returns deterministic bank/event mappings for the public audio scene', async () => {
  const first = await buildAudioEventBankReportV1(validManifestPath);
  const second = await buildAudioEventBankReportV1(validManifestPath);

  assertAudioEventBankReportV1(first);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  assert.equal(first.scene, 'audio-game-feedback');
  assert.equal(first.summary.bankCount, 2);
  assert.equal(first.summary.eventCount, 6);
  assert.equal(first.summary.sceneClipCount, 5);
  assert.equal(first.summary.referencedClipCount, 5);
  assert.equal(first.summary.unreferencedClipCount, 0);
  assert.equal(first.sceneAudio?.invalidRefs.length, 0);
  assert.equal(first.banks[0].bankId, 'gameplay');
  assert.deepEqual(
    first.banks.find((bank) => bank.bankId === 'menu')?.events.map((event) => event.eventId),
    ['scene.start', 'ui.activate', 'ui.navigate']
  );
  assert.deepEqual(
    first.banks.find((bank) => bank.bankId === 'gameplay')?.events.find((event) => event.eventId === 'manual.preview'),
    {
      eventId: 'manual.preview',
      clipIds: ['sfx.player.bump', 'sfx.ui.navigate'],
      clips: [
        {
          entityId: 'audio.player.bump',
          clipId: 'sfx.player.bump',
          kind: 'sfx',
          trigger: 'onBlockedMove',
          volume: 0.65,
          loop: false,
          src: null
        },
        {
          entityId: 'audio.ui.navigate',
          clipId: 'sfx.ui.navigate',
          kind: 'sfx',
          trigger: 'manual',
          volume: 0.55,
          loop: false,
          src: null
        }
      ]
    }
  );
});

test('buildAudioEventBankReportV1 reports missing clip references without crashing the scene report', async () => {
  const report = await buildAudioEventBankReportV1(invalidMissingClipManifestPath);

  assertAudioEventBankReportV1(report);
  assert.equal(report.ok, false);
  assert.equal(report.scene, 'audio-game-feedback');
  assert.match(report.errors[0].message, /referenced scene clipId not found: sfx\.missing\.clip/);
});

test('buildAudioEventBankReportV1 reports missing manifest files predictably', async () => {
  const report = await buildAudioEventBankReportV1(missingManifestPath);

  assertAudioEventBankReportV1(report);
  assert.equal(report.ok, false);
  assert.equal(report.manifest, null);
  assert.equal(report.sceneAudio, null);
  assert.deepEqual(report.errors, [
    {
      target: 'manifest',
      ref: null,
      path: '$',
      message: 'audio event bank manifest file was not found'
    }
  ]);
});
