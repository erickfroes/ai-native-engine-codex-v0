import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildAssetManifestValidationReportV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const fixtureDir = path.join(repoRoot, 'fixtures', 'assets');
const validAssetManifestPath = path.join(fixtureDir, 'valid.asset-manifest.json');
const invalidAssetManifestPath = path.join(fixtureDir, 'invalid.traversal-src.asset-manifest.json');
const malformedAssetManifestPath = path.join(fixtureDir, 'invalid-malformed.asset-manifest.json');
const missingAssetManifestPath = path.join(fixtureDir, 'missing.asset-manifest.json');

test('buildAssetManifestValidationReportV1 returns deterministic reports for valid manifests', async () => {
  const first = await buildAssetManifestValidationReportV1(validAssetManifestPath);
  const second = await buildAssetManifestValidationReportV1(validAssetManifestPath);

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    assetManifestValidationReportVersion: 1,
    ok: true,
    absolutePath: validAssetManifestPath,
    assetManifest: {
      assetManifestVersion: 1,
      assets: [
        {
          id: 'camera.icon',
          type: 'image',
          src: 'images/camera-icon.png',
          width: 16,
          height: 16
        },
        {
          id: 'player.sprite',
          type: 'image',
          src: 'images/player.png',
          width: 16,
          height: 16
        }
      ]
    },
    errors: []
  });
});

test('buildAssetManifestValidationReportV1 preserves parsed manifests for deterministic validation errors', async () => {
  const report = await buildAssetManifestValidationReportV1(invalidAssetManifestPath);

  assert.equal(report.assetManifestValidationReportVersion, 1);
  assert.equal(report.ok, false);
  assert.equal(report.absolutePath, invalidAssetManifestPath);
  assert.equal(report.assetManifest?.assetManifestVersion, 1);
  assert.deepEqual(report.errors, [
    {
      path: '$.assets[0].src',
      message: 'must stay inside the manifest directory'
    }
  ]);
});

test('buildAssetManifestValidationReportV1 reports malformed and missing manifest files predictably', async () => {
  const malformedReport = await buildAssetManifestValidationReportV1(malformedAssetManifestPath);
  const missingReport = await buildAssetManifestValidationReportV1(missingAssetManifestPath);

  assert.deepEqual(malformedReport, {
    assetManifestValidationReportVersion: 1,
    ok: false,
    absolutePath: malformedAssetManifestPath,
    assetManifest: null,
    errors: [
      {
        path: '$',
        message: 'asset manifest JSON is malformed'
      }
    ]
  });

  assert.deepEqual(missingReport, {
    assetManifestValidationReportVersion: 1,
    ok: false,
    absolutePath: missingAssetManifestPath,
    assetManifest: null,
    errors: [
      {
        path: '$',
        message: 'asset manifest file was not found'
      }
    ]
  });
});
