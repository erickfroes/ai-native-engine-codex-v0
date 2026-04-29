import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAudioLiteReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures');
const emptyFixturePath = path.join(fixtureDir, 'audio-lite-empty.scene.json');
const sfxFixturePath = path.join(fixtureDir, 'audio-lite-sfx.scene.json');
const musicLoopFixturePath = path.join(fixtureDir, 'audio-lite-music-loop.scene.json');
const blockedMoveFixturePath = path.join(fixtureDir, 'audio-lite-blocked-move.scene.json');
const invalidTriggerFixturePath = path.join(fixtureDir, 'invalid_audio_lite_trigger.scene.json');

test('buildAudioLiteReportV1 returns empty report for scenes without audio.clip', async () => {
  const report = await buildAudioLiteReportV1(emptyFixturePath);

  assert.deepEqual(report, {
    audioLiteReportVersion: 1,
    scene: 'audio-lite-empty-fixture',
    clips: [],
    triggers: [],
    warnings: [],
    invalidRefs: []
  });
});

test('buildAudioLiteReportV1 returns deterministic sfx clips and missing src warnings', async () => {
  const first = await buildAudioLiteReportV1(sfxFixturePath);
  const second = await buildAudioLiteReportV1(sfxFixturePath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    audioLiteReportVersion: 1,
    scene: 'audio-lite-sfx-fixture',
    clips: [
      {
        entityId: 'audio.step',
        clipId: 'sfx.step',
        kind: 'sfx',
        trigger: 'onMove',
        volume: 0.75,
        loop: false,
        src: null
      }
    ],
    triggers: [
      {
        trigger: 'onMove',
        clipIds: ['sfx.step']
      }
    ],
    warnings: [
      {
        code: 'AUDIO_CLIP_SRC_MISSING',
        entityId: 'audio.step',
        clipId: 'sfx.step',
        message: 'audio.clip src is missing; browser playback will use silent diagnostic fallback'
      }
    ],
    invalidRefs: []
  });
});

test('buildAudioLiteReportV1 reports music loop and missing local source references', async () => {
  const report = await buildAudioLiteReportV1(musicLoopFixturePath);

  assert.deepEqual(report, {
    audioLiteReportVersion: 1,
    scene: 'audio-lite-music-loop-fixture',
    clips: [
      {
        entityId: 'audio.music',
        clipId: 'music.theme',
        kind: 'music',
        trigger: 'onDemoStart',
        volume: 0.5,
        loop: true,
        src: 'audio/missing-theme.ogg'
      }
    ],
    triggers: [
      {
        trigger: 'onDemoStart',
        clipIds: ['music.theme']
      }
    ],
    warnings: [
      {
        code: 'AUDIO_CLIP_SRC_NOT_FOUND',
        entityId: 'audio.music',
        clipId: 'music.theme',
        message: 'audio.clip src was not found: audio/missing-theme.ogg'
      }
    ],
    invalidRefs: [
      {
        entityId: 'audio.music',
        clipId: 'music.theme',
        src: 'audio/missing-theme.ogg',
        reason: 'AUDIO_CLIP_SRC_NOT_FOUND'
      }
    ]
  });
});

test('buildAudioLiteReportV1 supports onBlockedMove clips', async () => {
  const report = await buildAudioLiteReportV1(blockedMoveFixturePath);

  assert.deepEqual(report.triggers, [
    {
      trigger: 'onBlockedMove',
      clipIds: ['sfx.bump']
    }
  ]);
  assert.equal(report.clips[0].trigger, 'onBlockedMove');
});

test('buildAudioLiteReportV1 defaults raw scene clips deterministically', async () => {
  const report = await buildAudioLiteReportV1({
    version: 1,
    metadata: { name: 'raw-audio-lite' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'z.audio',
        components: [
          {
            kind: 'audio.clip',
            version: 1,
            replicated: false,
            fields: {
              clipId: 'sfx.z',
              kind: 'sfx'
            }
          }
        ]
      },
      {
        id: 'a.audio',
        components: [
          {
            kind: 'audio.clip',
            version: 1,
            replicated: false,
            fields: {
              clipId: 'music.a',
              kind: 'music',
              loop: true,
              trigger: 'onDemoStart'
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(report.clips.map((clip) => clip.clipId), ['music.a', 'sfx.z']);
  assert.deepEqual(report.triggers, [
    {
      trigger: 'onDemoStart',
      clipIds: ['music.a']
    },
    {
      trigger: 'manual',
      clipIds: ['sfx.z']
    }
  ]);
});

test('buildAudioLiteReportV1 fails predictably for invalid raw audio scene objects', async () => {
  await assert.rejects(
    () => buildAudioLiteReportV1({
      version: 1,
      metadata: { name: 'invalid-raw-audio-lite' },
      systems: ['core.loop'],
      entities: [
        {
          id: 'audio.invalid',
          components: [
            {
              kind: 'audio.clip',
              version: 1,
              replicated: false,
              fields: {
                clipId: 'sfx.invalid',
                kind: 'sfx',
                trigger: 'onJump'
              }
            }
          ]
        }
      ]
    }),
    /buildAudioLiteReportV1: scene object is invalid: \$\.entities\[0\]\.components\[0\]\.fields\.trigger: audio\.clip trigger must be onDemoStart, onMove, onBlockedMove or manual when provided/
  );
});

test('buildAudioLiteReportV1 fails predictably for invalid audio scene files', async () => {
  await assert.rejects(
    () => buildAudioLiteReportV1(invalidTriggerFixturePath),
    /Scene validation failed for .*invalid_audio_lite_trigger\.scene\.json/
  );
});
