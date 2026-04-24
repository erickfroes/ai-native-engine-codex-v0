import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadSceneFile, createLoopSchedule, createPhasedLoopSchedulePreview } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

test('phased scheduler preview v1 is opt-in, deterministic and preserves scheduler order', async () => {
  const scene = await loadSceneFile(scenePath('tutorial.scene.json'));
  const schedule = createLoopSchedule(scene, { ticks: 4, seed: 10 });
  const first = createPhasedLoopSchedulePreview(scene, { ticks: 4, seed: 10 });
  const second = createPhasedLoopSchedulePreview(scene, { ticks: 4, seed: 10 });

  assert.equal(first.phasedSchedulerPreviewVersion, 1);
  assert.equal(first.seed, 10);
  assert.equal(first.ticks, 4);
  assert.deepEqual(first, second);

  assert.deepEqual(
    first.systemsPerTick.map((tick) => tick.systems.map((system) => system.name)),
    schedule.systemsPerTick.map((tick) => tick.systems.map((system) => system.name))
  );
  assert.deepEqual(first.systemsPerTick[0].systems.map((system) => system.phase), [
    'core',
    'input',
    'networking'
  ]);
});

