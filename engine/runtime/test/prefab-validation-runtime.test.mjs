import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPrefabValidationReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(testDir, 'fixtures', 'prefabs');
const validPrefabPath = path.join(fixtureDir, 'player-actor.prefab.json');
const duplicatePrefabPath = path.join(fixtureDir, 'invalid-duplicate-component.prefab.json');
const malformedPrefabPath = path.join(fixtureDir, 'invalid-malformed.prefab.json');
const missingPrefabPath = path.join(fixtureDir, 'missing.prefab.json');

test('buildPrefabValidationReportV1 returns deterministic reports for valid prefabs', async () => {
  const first = await buildPrefabValidationReportV1(validPrefabPath);
  const second = await buildPrefabValidationReportV1(validPrefabPath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    prefabValidationReportVersion: 1,
    ok: true,
    absolutePath: validPrefabPath,
    prefab: {
      prefabVersion: 1,
      metadata: {
        name: 'player.actor'
      },
      components: [
        {
          kind: 'transform',
          version: 1,
          replicated: false,
          fields: {
            x: 4,
            y: 3
          }
        },
        {
          kind: 'visual.sprite',
          version: 1,
          replicated: false,
          fields: {
            assetId: 'player.sprite',
            width: 16,
            height: 16,
            layer: 2
          }
        },
        {
          kind: 'collision.bounds',
          version: 1,
          replicated: false,
          fields: {
            x: 2,
            y: 3,
            width: 12,
            height: 14
          }
        }
      ]
    },
    errors: []
  });
});

test('buildPrefabValidationReportV1 reports duplicate component kinds predictably', async () => {
  const report = await buildPrefabValidationReportV1(duplicatePrefabPath);

  assert.equal(report.prefabValidationReportVersion, 1);
  assert.equal(report.ok, false);
  assert.equal(report.absolutePath, duplicatePrefabPath);
  assert.equal(report.prefab?.metadata?.name, 'invalid.duplicate.component');
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.components[1].kind' &&
        error.message === 'duplicate component kind in prefab: visual.sprite'
    )
  );
});

test('buildPrefabValidationReportV1 reports malformed and missing prefab files predictably', async () => {
  const malformedReport = await buildPrefabValidationReportV1(malformedPrefabPath);
  const missingReport = await buildPrefabValidationReportV1(missingPrefabPath);

  assert.deepEqual(malformedReport, {
    prefabValidationReportVersion: 1,
    ok: false,
    absolutePath: malformedPrefabPath,
    prefab: null,
    errors: [
      {
        path: '$',
        message: 'prefab JSON is malformed'
      }
    ]
  });

  assert.deepEqual(missingReport, {
    prefabValidationReportVersion: 1,
    ok: false,
    absolutePath: missingPrefabPath,
    prefab: null,
    errors: [
      {
        path: '$',
        message: 'prefab file was not found'
      }
    ]
  });
});
