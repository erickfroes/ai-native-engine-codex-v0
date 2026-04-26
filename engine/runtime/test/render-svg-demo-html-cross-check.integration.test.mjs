import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildRenderSnapshotV1,
  renderSnapshotToSvgV1,
  renderSvgDemoHtmlV1,
  RENDER_SVG_VERSION,
  SVG_DEMO_HTML_VERSION
} from '../src/index.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const cliPath = path.join(repoRoot, 'engine', 'runtime', 'src', 'cli.mjs');
const tutorialScenePath = path.join(repoRoot, 'scenes', 'tutorial.scene.json');

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
}

test('render-svg-demo stays aligned with runtime SVG output for the same scene options', async () => {
  const tick = 4;
  const width = 320;
  const height = 180;
  const snapshot = await buildRenderSnapshotV1(tutorialScenePath, { tick, width, height });
  const svg = renderSnapshotToSvgV1(snapshot);
  const runtimeHtml = renderSvgDemoHtmlV1({
    title: `${snapshot.scene} SVG Demo`,
    svg,
    metadata: {
      scene: snapshot.scene,
      svgVersion: RENDER_SVG_VERSION,
      tick: snapshot.tick,
      viewport: `${snapshot.viewport.width}x${snapshot.viewport.height}`
    }
  });

  const result = runCli([
    'render-svg-demo',
    tutorialScenePath,
    '--tick',
    String(tick),
    '--width',
    String(width),
    '--height',
    String(height),
    '--json'
  ]);

  assert.equal(result.status, 0, result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.demoHtmlVersion, SVG_DEMO_HTML_VERSION);
  assert.equal(payload.scene, snapshot.scene);
  assert.equal(payload.tick, snapshot.tick);
  assert.equal(payload.html, runtimeHtml);
  assert.ok(payload.html.includes(svg));
});

test('render-svg-demo stays deterministic for the same scene options', () => {
  const args = [
    'render-svg-demo',
    tutorialScenePath,
    '--tick',
    '4',
    '--width',
    '320',
    '--height',
    '180',
    '--json'
  ];
  const first = runCli(args);
  const second = runCli(args);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
});
