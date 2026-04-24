import test from 'node:test';
import assert from 'node:assert/strict';

import {
  simulateNetworkReplication,
  formatNetworkReplicationSimulationReport
} from '../src/network/simulate-replication.mjs';

test('simulates valid replication stream timeline', async () => {
  const report = await simulateNetworkReplication([
    './scenes/tutorial.netmsg.json',
    './scenes/tutorial.netmsg.tick43.json'
  ]);

  assert.equal(report.ok, true);
  assert.equal(report.snapshotCount, 2);
  assert.equal(report.timeline[0].tick, 42);
  assert.equal(report.timeline[1].tick, 43);
});

test('reports errors for non-increasing replication stream ticks', async () => {
  const report = await simulateNetworkReplication([
    './scenes/tutorial.netmsg.tick43.json',
    './scenes/tutorial.netmsg.json'
  ]);

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.payload.tick'));
});

test('reports errors for unsupported opcode in replication stream', async () => {
  const report = await simulateNetworkReplication([
    './scenes/tutorial.netmsg.tick43.json',
    './engine/runtime/test/fixtures/network/invalid.unsupported-opcode.netmsg.json'
  ]);

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.opcode'));
});

test('formats replication simulation report', () => {
  const text = formatNetworkReplicationSimulationReport({
    ok: true,
    snapshotCount: 2,
    timeline: [
      { path: '/tmp/a.json', tick: 42, entityCount: 2, entityIds: ['camera.main', 'player.hero'] },
      { path: '/tmp/b.json', tick: 43, entityCount: 2, entityIds: ['camera.main', 'player.hero'] }
    ],
    errors: []
  });

  assert.match(text, /Snapshots: 2/);
  assert.match(text, /Status: OK/);
  assert.match(text, /tick 42/);
});
