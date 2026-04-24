import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateNetworkSnapshotSequence,
  formatNetworkSnapshotSequenceReport
} from '../src/network/validate-sequence.mjs';

test('validates increasing snapshot sequence successfully', async () => {
  const report = await validateNetworkSnapshotSequence(
    './scenes/tutorial.netmsg.json',
    './scenes/tutorial.netmsg.tick43.json'
  );

  assert.equal(report.ok, true);
  assert.equal(report.summary.fromTick, 42);
  assert.equal(report.summary.toTick, 43);
  assert.equal(report.summary.tickDelta, 1);
});

test('fails snapshot sequence when ticks do not increase', async () => {
  const report = await validateNetworkSnapshotSequence(
    './scenes/tutorial.netmsg.tick43.json',
    './scenes/tutorial.netmsg.json'
  );

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.payload.tick'));
});

test('fails snapshot sequence when opcode is outside world.snapshot contract', async () => {
  const report = await validateNetworkSnapshotSequence(
    './scenes/tutorial.netmsg.tick43.json',
    './engine/runtime/test/fixtures/network/invalid.unsupported-opcode.netmsg.json'
  );

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.opcode'));
});

test('formats invalid sequence report with readable errors', () => {
  const text = formatNetworkSnapshotSequenceReport({
    ok: false,
    beforePath: '/tmp/before.json',
    afterPath: '/tmp/after.json',
    summary: {
      opcode: 'replication.snapshot',
      version: 1,
      direction: 'server_to_client',
      fromTick: 10,
      toTick: 10,
      tickDelta: 0
    },
    errors: [
      {
        path: '$.payload.tick',
        message: 'snapshot sequence requires strictly increasing ticks'
      }
    ]
  });

  assert.match(text, /Status: INVALID/);
  assert.match(text, /payload\.tick/);
});
