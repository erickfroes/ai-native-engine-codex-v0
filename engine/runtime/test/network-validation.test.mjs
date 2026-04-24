import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateNetMessageFile, formatNetMessageValidationReport } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

function fixturePath(relativePath) {
  return path.join(repoRoot, 'engine/runtime/test/fixtures/network', relativePath);
}

test('validates tutorial network message successfully', async () => {
  const report = await validateNetMessageFile(scenePath('tutorial.netmsg.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.message.direction, 'server_to_client');
});

test('reports schema errors for missing required network message fields', async () => {
  const report = await validateNetMessageFile(fixturePath('invalid.missing-direction.netmsg.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.direction'));
});

test('formats invalid network report with readable error section', async () => {
  const report = await validateNetMessageFile(fixturePath('invalid.bad-reliability.netmsg.json'));
  const formatted = formatNetMessageValidationReport(report);

  assert.equal(report.ok, false);
  assert.match(formatted, /Status: INVALID/);
  assert.match(formatted, /Errors:/);
  assert.match(formatted, /\$\.reliability/);
});

test('enforces world.snapshot contract invariants beyond schema shape', async () => {
  const report = await validateNetMessageFile(fixturePath('invalid.snapshot-contract.netmsg.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.path === '$.direction'));
  assert.ok(report.errors.some((error) => error.path === '$.reliability'));
  assert.ok(report.errors.some((error) => error.path === '$.payload.tick'));
  assert.ok(report.errors.some((error) => error.message.includes('duplicate entity id')));
});
