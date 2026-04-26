import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRenderSnapshotV1, renderSnapshotToSvgV1 } from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

test('renderSnapshotToSvgV1 returns deterministic SVG for RenderSnapshot v1 rect draw calls', async () => {
  const snapshot = await buildRenderSnapshotV1(tutorialScenePath, { tick: 4, width: 320, height: 180 });

  const first = renderSnapshotToSvgV1(snapshot);
  const second = renderSnapshotToSvgV1(snapshot);

  assert.equal(first, second);
  assert.equal(
    first,
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="1" data-scene="tutorial" data-tick="4" width="320" height="180" viewBox="0 0 320 180">
  <rect id="camera.main" data-layer="0" x="0" y="4" width="16" height="16" />
  <rect id="player.hero" data-layer="0" x="0" y="0" width="16" height="16" />
</svg>
`
  );
});

test('renderSnapshotToSvgV1 renders sprite drawCalls as deterministic rect fallbacks with data-asset-id', () => {
  const svg = renderSnapshotToSvgV1({
    renderSnapshotVersion: 1,
    scene: 'sprite-scene',
    tick: 2,
    viewport: {
      width: 64,
      height: 48
    },
    drawCalls: [
      {
        kind: 'sprite',
        id: 'camera.icon',
        assetId: 'camera.icon',
        x: 4,
        y: 6,
        width: 16,
        height: 16,
        layer: 0
      }
    ]
  });

  assert.equal(
    svg,
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="1" data-scene="sprite-scene" data-tick="2" width="64" height="48" viewBox="0 0 64 48">
  <rect id="camera.icon" data-asset-id="camera.icon" data-kind="sprite" data-layer="0" x="4" y="6" width="16" height="16" />
</svg>
`
  );
});

test('renderSnapshotToSvgV1 preserves drawCall order already present in the snapshot', () => {
  const svg = renderSnapshotToSvgV1({
    renderSnapshotVersion: 1,
    scene: 'order-check',
    tick: 0,
    viewport: {
      width: 16,
      height: 16
    },
    drawCalls: [
      {
        kind: 'sprite',
        id: 'z.entity',
        assetId: 'z.sprite',
        x: 8,
        y: 8,
        width: 4,
        height: 4,
        layer: 9
      },
      {
        kind: 'rect',
        id: 'a.entity',
        x: 1,
        y: 2,
        width: 3,
        height: 3,
        layer: -5
      }
    ]
  });

  assert.ok(svg.indexOf('id="z.entity"') < svg.indexOf('id="a.entity"'));
});

test('renderSnapshotToSvgV1 ignores optional assetSrc when rendering sprite fallback rects', () => {
  const svg = renderSnapshotToSvgV1({
    renderSnapshotVersion: 1,
    scene: 'visual-sprite-svg',
    tick: 4,
    viewport: {
      width: 64,
      height: 48
    },
    drawCalls: [
      {
        kind: 'sprite',
        id: 'player.hero',
        assetId: 'player.sprite',
        assetSrc: 'file:///repo/fixtures/assets/images/player.png',
        x: 10,
        y: 12,
        width: 20,
        height: 24,
        layer: 2
      }
    ]
  });

  assert.match(svg, /data-asset-id="player\.sprite"/);
  assert.doesNotMatch(svg, /assetSrc|file:\/\/\//);
});
