import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../src/schema/mini-json-schema.mjs';
import {
  assertVisualRegressionBaselineReportV1,
  assertVisualRegressionBaselineReportV1Rejects
} from './helpers/assertVisualRegressionBaselineReportV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'visual-regression-baseline-report-v1.schema.json');

async function loadSchema() {
  return JSON.parse(await readFile(schemaPath, 'utf8'));
}

function createValidReport() {
  return {
    visualRegressionBaselineReportVersion: 1,
    scene: 'visual-sample',
    tick: 4,
    viewport: {
      width: 320,
      height: 180
    },
    renderSnapshotVersion: 1,
    svgVersion: 1,
    hashAlgorithm: 'sha256',
    snapshotHash: 'a'.repeat(64),
    svgHash: 'b'.repeat(64),
    drawCallCount: 3,
    drawCallsByKind: {
      rect: 2,
      sprite: 1
    },
    layers: [
      {
        layer: -10,
        count: 2
      },
      {
        layer: 2,
        count: 1
      }
    ],
    uniqueSpriteAssetIds: ['player.sprite']
  };
}

test('VisualRegressionBaselineReport v1 matches helper and schema', async () => {
  const report = createValidReport();

  assertVisualRegressionBaselineReportV1(report);

  const schema = await loadSchema();
  const errors = validateWithSchema(report, schema, {
    'visual-regression-baseline-report-v1.schema.json': { schema }
  });
  assert.deepEqual(errors, []);
});

test('VisualRegressionBaselineReport v1 rejects extra fields at controlled levels', async () => {
  const report = createValidReport();
  report.viewport.scale = 2;
  report.drawCallsByKind.tile = 1;
  report.layers[0].label = 'background';
  report.debug = true;

  assertVisualRegressionBaselineReportV1Rejects(report);

  const schema = await loadSchema();
  const errors = validateWithSchema(report, schema, {
    'visual-regression-baseline-report-v1.schema.json': { schema }
  });

  assert.ok(errors.some((error) => error.path === '$.viewport.scale' && error.message === 'is not allowed by schema'));
  assert.ok(
    errors.some((error) => error.path === '$.drawCallsByKind.tile' && error.message === 'is not allowed by schema')
  );
  assert.ok(errors.some((error) => error.path === '$.layers[0].label' && error.message === 'is not allowed by schema'));
  assert.ok(errors.some((error) => error.path === '$.debug' && error.message === 'is not allowed by schema'));
});

test('VisualRegressionBaselineReport v1 helper rejects inconsistent draw call summaries', () => {
  const report = createValidReport();
  report.drawCallsByKind.sprite = 0;

  assertVisualRegressionBaselineReportV1Rejects(report);
});

test('VisualRegressionBaselineReport v1 helper rejects malformed hashes and unsorted arrays', () => {
  const badHash = createValidReport();
  badHash.snapshotHash = 'sha256:not-hex';
  assertVisualRegressionBaselineReportV1Rejects(badHash);

  const unsortedLayers = createValidReport();
  unsortedLayers.layers = [
    { layer: 2, count: 1 },
    { layer: -10, count: 2 }
  ];
  assertVisualRegressionBaselineReportV1Rejects(unsortedLayers);

  const unsortedAssets = createValidReport();
  unsortedAssets.uniqueSpriteAssetIds = ['z.sprite', 'a.sprite'];
  assertVisualRegressionBaselineReportV1Rejects(unsortedAssets);
});
