import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const prefabDir = path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', 'prefabs');
const validPrefabPath = path.join(prefabDir, 'player-actor.prefab.json');
const duplicatePrefabPath = path.join(prefabDir, 'invalid-duplicate-component.prefab.json');
const malformedPrefabPath = path.join(prefabDir, 'invalid-malformed.prefab.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('validate-prefab valid fixture passes in readable mode', () => {
  const result = runCli(['validate-prefab', validPrefabPath]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Prefab validation report version: 1/);
  assert.match(result.stdout, /Name: player\.actor/);
  assert.match(result.stdout, /Components: 3/);
  assert.match(result.stdout, /Status: OK/);
});

test('validate-prefab invalid prefab returns deterministic JSON report', () => {
  const first = runCli(['validate-prefab', duplicatePrefabPath, '--json']);
  const second = runCli(['validate-prefab', duplicatePrefabPath, '--json']);

  assert.equal(first.status, 1, first.stderr);
  assert.equal(second.status, 1, second.stderr);

  const firstReport = JSON.parse(first.stdout);
  const secondReport = JSON.parse(second.stdout);

  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.prefabValidationReportVersion, 1);
  assert.equal(firstReport.ok, false);
  assert.equal(firstReport.prefab.metadata.name, 'invalid.duplicate.component');
  assert.ok(
    firstReport.errors.some(
      (error) =>
        error.path === '$.components[1].kind' &&
        error.message === 'duplicate component kind in prefab: visual.sprite'
    )
  );
});

test('validate-prefab reports malformed prefab files predictably', () => {
  const result = runCli(['validate-prefab', malformedPrefabPath]);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: INVALID/);
  assert.match(result.stdout, /Name: \(missing\)/);
  assert.match(result.stdout, /\$:\s+prefab JSON is malformed/);
});
