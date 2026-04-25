import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runLoopWithKeyboardInputScriptV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

function inputScriptPath(relativePath) {
  return path.join(repoRoot, 'fixtures', 'input-script', relativePath);
}

test('runLoopWithKeyboardInputScriptV1 is deterministic for the same scene, script, ticks and seed', async () => {
  const first = await runLoopWithKeyboardInputScriptV1(
    scenePath('tutorial.scene.json'),
    inputScriptPath('valid.keyboard-input-script.json'),
    { ticks: 2, seed: 10 }
  );
  const second = await runLoopWithKeyboardInputScriptV1(
    scenePath('tutorial.scene.json'),
    inputScriptPath('valid.keyboard-input-script.json'),
    { ticks: 2, seed: 10 }
  );

  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first).sort(), ['executedSystems', 'finalState', 'ticksExecuted']);
  assert.equal(first.ticksExecuted, 2);
  assert.equal(first.finalState, 17);
});

test('runLoopWithKeyboardInputScriptV1 can return trace envelope with per-tick overridden keyboard deltas', async () => {
  const traced = await runLoopWithKeyboardInputScriptV1(
    scenePath('tutorial.scene.json'),
    inputScriptPath('valid.keyboard-input-script.json'),
    { ticks: 2, seed: 10, trace: true }
  );

  assert.equal(traced.report.finalState, 17);
  assert.deepEqual(
    traced.trace.systemsPerTick.map((tickEntry) => tickEntry.systems.find((system) => system.name === 'input.keyboard')?.delta),
    [1, 0]
  );
});
