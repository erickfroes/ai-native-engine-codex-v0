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
        kind: 'rect',
        id: 'z.entity',
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

test('renderSnapshotToSvgV1 renders a deterministic empty SVG when drawCalls is empty', () => {
  const snapshot = {
    renderSnapshotVersion: 1,
    scene: 'empty-scene',
    tick: 0,
    viewport: {
      width: 32,
      height: 24
    },
    drawCalls: []
  };

  const first = renderSnapshotToSvgV1(snapshot);
  const second = renderSnapshotToSvgV1(snapshot);

  assert.equal(first, second);
  assert.equal(
    first,
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="1" data-scene="empty-scene" data-tick="0" width="32" height="24" viewBox="0 0 32 24">
</svg>
`
  );
});

test('renderSnapshotToSvgV1 serializes multiple rect draw calls in the exact snapshot order', () => {
  const svg = renderSnapshotToSvgV1({
    renderSnapshotVersion: 1,
    scene: 'multi-rect',
    tick: 2,
    viewport: {
      width: 64,
      height: 48
    },
    drawCalls: [
      {
        kind: 'rect',
        id: 'background',
        x: 0,
        y: 0,
        width: 64,
        height: 48,
        layer: -1
      },
      {
        kind: 'rect',
        id: 'mid',
        x: 10,
        y: 12,
        width: 20,
        height: 8,
        layer: 1
      },
      {
        kind: 'rect',
        id: 'front',
        x: 14,
        y: 18,
        width: 6,
        height: 6,
        layer: 9
      }
    ]
  });

  assert.equal(
    svg,
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="1" data-scene="multi-rect" data-tick="2" width="64" height="48" viewBox="0 0 64 48">
  <rect id="background" data-layer="-1" x="0" y="0" width="64" height="48" />
  <rect id="mid" data-layer="1" x="10" y="12" width="20" height="8" />
  <rect id="front" data-layer="9" x="14" y="18" width="6" height="6" />
</svg>
`
  );
});

test('renderSnapshotToSvgV1 escapes scene and draw call ids in SVG attributes', () => {
  const svg = renderSnapshotToSvgV1({
    renderSnapshotVersion: 1,
    scene: `scene & "quoted" <tag> 'apostrophe'`,
    tick: 3,
    viewport: {
      width: 8,
      height: 8
    },
    drawCalls: [
      {
        kind: 'rect',
        id: `entity & "quoted" <tag> 'apostrophe'`,
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        layer: 5
      }
    ]
  });

  assert.match(
    svg,
    /data-scene="scene &amp; &quot;quoted&quot; &lt;tag&gt; &apos;apostrophe&apos;"/
  );
  assert.match(
    svg,
    /<rect id="entity &amp; &quot;quoted&quot; &lt;tag&gt; &apos;apostrophe&apos;" data-layer="5" x="1" y="2" width="3" height="4" \/>/
  );
});
