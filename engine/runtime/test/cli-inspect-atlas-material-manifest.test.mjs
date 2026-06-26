import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertAtlasMaterialManifestReportV1 } from './helpers/assertAtlasMaterialManifestReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const fixtureDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'atlas-material');
const validManifestPath = path.join(fixtureDir, 'starter.atlas-material.json');
const invalidManifestPath = path.join(fixtureDir, 'invalid-missing-region-or-material-ref.atlas-material.json');
const malformedManifestPath = path.join(fixtureDir, 'invalid-malformed.atlas-material.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('inspect-atlas-material-manifest returns deterministic AtlasMaterialManifestReport v1 JSON', () => {
  const first = runCli(['inspect-atlas-material-manifest', validManifestPath, '--json']);
  const second = runCli(['inspect-atlas-material-manifest', validManifestPath, '--json']);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);
  assertAtlasMaterialManifestReportV1(firstReport);
  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.ok, true);
  assert.equal(firstReport.summary.regionCount, 2);
});

test('inspect-atlas-material-manifest emits a compact readable summary', () => {
  const result = runCli(['inspect-atlas-material-manifest', validManifestPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Atlas\/material manifest report version: 1/);
  assert.match(result.stdout, /Status: OK/);
  assert.match(result.stdout, /Atlases: 1/);
  assert.match(result.stdout, /Regions: 2/);
  assert.match(result.stdout, /Sprite bindings: 1/);
  assert.match(result.stdout, /Tile bindings: 1/);
});

test('inspect-atlas-material-manifest returns status 1 and JSON diagnostics for invalid refs', () => {
  const result = runCli(['inspect-atlas-material-manifest', invalidManifestPath, '--json']);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assertAtlasMaterialManifestReportV1(report);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.target === 'spriteBinding' && error.path === '$.sprites[0].regionId'));
});

test('inspect-atlas-material-manifest reports malformed manifests predictably', () => {
  const result = runCli(['inspect-atlas-material-manifest', malformedManifestPath]);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /atlas\/material manifest JSON is malformed/);
});

test('inspect-atlas-material-manifest reports usage for missing manifest path', () => {
  const result = runCli(['inspect-atlas-material-manifest', '--json']);

  assert.equal(result.status, 2);
  assert.match(result.stdout, /inspect-atlas-material-manifest <path> \[--json\]/);
});
