import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const validAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'valid.asset-manifest.json');
const invalidAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid.traversal-src.asset-manifest.json');
const malformedAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'invalid-malformed.asset-manifest.json');
const missingAssetManifestPath = path.join(repoRoot, 'fixtures', 'assets', 'missing.asset-manifest.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('validate-asset-manifest valid fixture passes in readable mode', () => {
  const result = runCli(['validate-asset-manifest', validAssetManifestPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Asset manifest:/);
  assert.match(result.stdout, /Asset manifest validation report version: 1/);
  assert.match(result.stdout, /Version: 1/);
  assert.match(result.stdout, /Assets: 2/);
  assert.match(result.stdout, /Status: OK/);
});

test('validate-asset-manifest invalid fixture returns deterministic JSON report', () => {
  const first = runCli(['validate-asset-manifest', invalidAssetManifestPath, '--json']);
  const second = runCli(['validate-asset-manifest', invalidAssetManifestPath, '--json']);

  assert.equal(first.status, 1, first.stderr);
  assert.equal(second.status, 1, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);

  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.assetManifestValidationReportVersion, 1);
  assert.equal(firstReport.ok, false);
  assert.equal(firstReport.absolutePath, invalidAssetManifestPath);
  assert.equal(firstReport.assetManifest.assetManifestVersion, 1);
  assert.deepEqual(firstReport.errors, [
    {
      path: '$.assets[0].src',
      message: 'must stay inside the manifest directory'
    }
  ]);
});

test('validate-asset-manifest prints readable invalid status in default mode', () => {
  const result = runCli(['validate-asset-manifest', invalidAssetManifestPath]);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /\$\.assets\[0\]\.src: must stay inside the manifest directory/);
});

test('validate-asset-manifest reports malformed manifest files predictably', () => {
  const result = runCli(['validate-asset-manifest', malformedAssetManifestPath]);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /Version: \(missing\)/);
  assert.match(result.stdout, /Assets: \(missing\)/);
  assert.match(result.stdout, /\$:\s+asset manifest JSON is malformed/);
});

test('validate-asset-manifest reports missing files predictably', () => {
  const result = runCli(['validate-asset-manifest', missingAssetManifestPath]);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /Version: \(missing\)/);
  assert.match(result.stdout, /Assets: \(missing\)/);
  assert.match(result.stdout, /\$:\s+asset manifest file was not found/);
});
