import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, runDeterministicReplay, buildReplayArtifact } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('buildReplayArtifact returns deterministic compact artifact with exact shape', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));
  const replayA = runDeterministicReplay(scene, { ticks: 3, seed: 42 });
  const replayB = runDeterministicReplay(scene, { ticks: 3, seed: 42 });

  const artifactA = buildReplayArtifact(scene.metadata.name, replayA);
  const artifactB = buildReplayArtifact(scene.metadata.name, replayB);

  const expectedKeys = [
    'executedSystemCount',
    'finalState',
    'replayArtifactVersion',
    'replaySignature',
    'scene',
    'seed',
    'snapshotOpcode',
    'ticks'
  ];

  assert.deepEqual(Object.keys(artifactA).sort(), expectedKeys);
  assert.equal(artifactA.replayArtifactVersion, 1);
  assert.equal(artifactA.snapshotOpcode, 'world.snapshot');
  assert.deepEqual(artifactA, artifactB);
});
