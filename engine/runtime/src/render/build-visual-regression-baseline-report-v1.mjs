import { sha256Hex } from '../save/canonical-json.mjs';
import { buildRenderSnapshotV1 } from './build-render-snapshot-v1.mjs';
import {
  renderSnapshotToSvgV1,
  RENDER_SVG_VERSION
} from './render-snapshot-to-svg-v1.mjs';

export const VISUAL_REGRESSION_BASELINE_REPORT_VERSION = 1;

function compareNumber(left, right) {
  return left - right;
}

function compareStableString(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`buildVisualRegressionBaselineReportV1: \`${name}\` must be an object`);
  }
}

function summarizeDrawCalls(drawCalls) {
  const drawCallsByKind = { rect: 0, sprite: 0 };
  const layers = new Map();
  const uniqueSpriteAssetIds = new Set();

  for (const drawCall of drawCalls) {
    drawCallsByKind[drawCall.kind] = (drawCallsByKind[drawCall.kind] ?? 0) + 1;
    layers.set(drawCall.layer, (layers.get(drawCall.layer) ?? 0) + 1);

    if (drawCall.kind === 'sprite' && typeof drawCall.assetId === 'string') {
      uniqueSpriteAssetIds.add(drawCall.assetId);
    }
  }

  return {
    drawCallCount: drawCalls.length,
    drawCallsByKind,
    layers: Array.from(layers.entries())
      .sort(([leftLayer], [rightLayer]) => compareNumber(leftLayer, rightLayer))
      .map(([layer, count]) => ({ layer, count })),
    uniqueSpriteAssetIds: Array.from(uniqueSpriteAssetIds).sort(compareStableString)
  };
}

export async function buildVisualRegressionBaselineReportV1(sceneOrPath, options = {}) {
  assertObject(options, 'options');

  const snapshot = await buildRenderSnapshotV1(sceneOrPath, options);
  const svg = renderSnapshotToSvgV1(snapshot);
  const summary = summarizeDrawCalls(snapshot.drawCalls);

  return {
    visualRegressionBaselineReportVersion: VISUAL_REGRESSION_BASELINE_REPORT_VERSION,
    scene: snapshot.scene,
    tick: snapshot.tick,
    viewport: {
      width: snapshot.viewport.width,
      height: snapshot.viewport.height
    },
    renderSnapshotVersion: snapshot.renderSnapshotVersion,
    svgVersion: RENDER_SVG_VERSION,
    hashAlgorithm: 'sha256',
    snapshotHash: sha256Hex(snapshot),
    svgHash: sha256Hex(svg),
    ...summary
  };
}
