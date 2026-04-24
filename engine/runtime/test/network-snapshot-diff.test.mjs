import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { diffNetworkSnapshotFiles, formatNetworkSnapshotDiffReport } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

function fixturePath(relativePath) {
  return path.join(repoRoot, 'engine/runtime/test/fixtures/network', relativePath);
}

test('diffs two network snapshots and reports structural changes', async () => {
  const report = await diffNetworkSnapshotFiles(
    scenePath('tutorial.netmsg.json'),
    scenePath('tutorial.netmsg.tick43.json')
  );

  assert.equal(report.ok, true);
  assert.equal(report.diff.fromTick, 42);
  assert.equal(report.diff.toTick, 43);
  assert.deepEqual(report.diff.addedEntityIds, ['enemy.slime.01']);
  assert.equal(report.diff.changedEntityCount, 2);
});

test('fails snapshot diff when one of the snapshots is invalid', async () => {
  const report = await diffNetworkSnapshotFiles(
    scenePath('tutorial.netmsg.json'),
    fixturePath('invalid.missing-direction.netmsg.json')
  );

  assert.equal(report.ok, false);
  assert.equal(report.diff, null);
  assert.ok(report.errors.some((error) => error.path === '$.direction'));
});

test('formats successful snapshot diff with key delta fields', async () => {
  const report = await diffNetworkSnapshotFiles(
    scenePath('tutorial.netmsg.json'),
    scenePath('tutorial.netmsg.tick43.json')
  );
  const formatted = formatNetworkSnapshotDiffReport(report);

  assert.match(formatted, /Status: OK/);
  assert.match(formatted, /Ticks: 42 -> 43/);
  assert.match(formatted, /Added: enemy\.slime\.01/);
});
