import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertRenderSnapshotV1 } from '../../../engine/runtime/test/helpers/assertRenderSnapshotV1.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const serverPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');

function createClient() {
  const child = spawn(process.execPath, [serverPath], {
    cwd: repoRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const pending = new Map();
  let nextId = 1;
  let buffer = '';

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const message = JSON.parse(line);
      if (message.id !== undefined && pending.has(message.id)) {
        const { resolve } = pending.get(message.id);
        pending.delete(message.id);
        resolve(message);
      }
    }
  });

  child.stderr.resume();

  function request(method, params) {
    const id = nextId++;
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })}\n`);
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  }

  function notify(method, params) {
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) })}\n`);
  }

  async function close() {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
  }

  return { request, notify, close };
}

function assertBrowserDemoStructuredContent(payload, options = {}) {
  const expectedScene = options.scene ?? 'tutorial';
  const expectedTick = options.tick ?? 4;
  const expectedControllableEntityId = options.controllableEntityId ?? 'player.hero';
  assert.deepEqual(Object.keys(payload), ['browserDemoVersion', 'scene', 'tick', 'html']);
  assert.equal(payload.browserDemoVersion, 1);
  assert.equal(payload.scene, expectedScene);
  assert.equal(payload.tick, expectedTick);
  assert.equal('outputPath' in payload, false);
  assert.match(payload.html, /^<!DOCTYPE html>/);
  assert.match(
    payload.html,
    new RegExp(
      `<canvas id="browser-playable-demo-canvas" data-browser-demo-version="1" data-scene="${expectedScene}" data-tick="${expectedTick}" data-controllable-entity="${expectedControllableEntityId}" width="320" height="180" tabindex="0"`
    )
  );
  assert.match(payload.html, /aria-label="Browser playable demo canvas"/);
  assert.match(payload.html, /requestAnimationFrame\(renderFrame\)/);
  assert.match(payload.html, />Pause rendering<\/button>/);
  assert.match(payload.html, /Resume rendering/);
  assert.match(payload.html, />Reset position<\/button>/);
  assert.match(
    payload.html,
    /Click the canvas, then use Arrow Keys or WASD to move the highlighted rectangle by 4 px per keydown\./
  );
  assert.match(payload.html, /addEventListener\("keydown"/);
  assert.doesNotMatch(
    payload.html,
    /<script[^>]+src=|<link[^>]+href=|https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|import\(|Date\.now|new Date|performance\.now|localStorage/
  );
}

function assertBrowserDemoStructuredContentWithAssetLoading(payload) {
  assertBrowserDemoStructuredContent(payload, {
    scene: 'sprite-fixture',
    tick: 4,
    controllableEntityId: 'camera.icon'
  });
  assert.match(payload.html, /new Image\(\)/);
  assert.match(payload.html, /drawImage\(/);
  assert.match(payload.html, /assetSrc/);
  assert.match(payload.html, /"assetSrc":"file:\/\/\/[^"]+images\/player\.png"/);
  assert.match(payload.html, /"assetSrc":"file:\/\/\/[^"]+images\/camera-icon\.png"/);
}

test('mcp server lists tools, validates scenes, emits snapshots and runs deterministic replay', async () => {
  const client = createClient();

  try {
    const initResponse = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    client.notify('notifications/initialized');

    const toolsResponse = await client.request('tools/list');
    assert.ok(Array.isArray(toolsResponse.result.tools));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_scene'));
    const validateInputIntentTool = toolsResponse.result.tools.find((tool) => tool.name === 'validate_input_intent');
    assert.ok(validateInputIntentTool);
    assert.equal(validateInputIntentTool.title, 'Validate Input Intent');
    assert.deepEqual(validateInputIntentTool.inputSchema.required, ['path']);
    const keyboardToInputIntentTool = toolsResponse.result.tools.find((tool) => tool.name === 'keyboard_to_input_intent');
    assert.ok(keyboardToInputIntentTool);
    assert.equal(keyboardToInputIntentTool.title, 'Keyboard To Input Intent');
    assert.deepEqual(keyboardToInputIntentTool.inputSchema.required, ['tick', 'entityId', 'keys']);
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_save'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'emit_world_snapshot'));
    const renderSnapshotTool = toolsResponse.result.tools.find((tool) => tool.name === 'render_snapshot');
    assert.ok(renderSnapshotTool);
    assert.deepEqual(renderSnapshotTool.inputSchema.required, ['path']);
    assert.ok(Object.prototype.hasOwnProperty.call(renderSnapshotTool.inputSchema.properties, 'tick'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderSnapshotTool.inputSchema.properties, 'width'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderSnapshotTool.inputSchema.properties, 'height'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderSnapshotTool.inputSchema.properties, 'assetManifestPath'));
    const renderSvgTool = toolsResponse.result.tools.find((tool) => tool.name === 'render_svg');
    assert.ok(renderSvgTool);
    assert.deepEqual(renderSvgTool.inputSchema.required, ['path']);
    assert.ok(Object.prototype.hasOwnProperty.call(renderSvgTool.inputSchema.properties, 'tick'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderSvgTool.inputSchema.properties, 'width'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderSvgTool.inputSchema.properties, 'height'));
    const renderBrowserDemoTool = toolsResponse.result.tools.find((tool) => tool.name === 'render_browser_demo');
    assert.ok(renderBrowserDemoTool);
    assert.deepEqual(renderBrowserDemoTool.inputSchema.required, ['path']);
    assert.ok(Object.prototype.hasOwnProperty.call(renderBrowserDemoTool.inputSchema.properties, 'tick'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderBrowserDemoTool.inputSchema.properties, 'width'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderBrowserDemoTool.inputSchema.properties, 'height'));
    assert.ok(Object.prototype.hasOwnProperty.call(renderBrowserDemoTool.inputSchema.properties, 'assetManifestPath'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'run_loop'));
    assert.ok(
      Object.prototype.hasOwnProperty.call(
        toolsResponse.result.tools.find((tool) => tool.name === 'run_loop').inputSchema.properties,
        'keyboardScriptPath'
      )
    );
    assert.ok(
      Object.prototype.hasOwnProperty.call(
        toolsResponse.result.tools.find((tool) => tool.name === 'run_loop').inputSchema.properties,
        'movementBlocking'
      )
    );
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'plan_loop'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'run_replay'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'run_replay_artifact'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'inspect_state'));
    const inspectCollisionBoundsTool = toolsResponse.result.tools.find((tool) => tool.name === 'inspect_collision_bounds');
    assert.ok(inspectCollisionBoundsTool);
    assert.deepEqual(inspectCollisionBoundsTool.inputSchema.required, ['path']);
    const inspectCollisionOverlapsTool = toolsResponse.result.tools.find(
      (tool) => tool.name === 'inspect_collision_overlaps'
    );
    assert.ok(inspectCollisionOverlapsTool);
    assert.deepEqual(inspectCollisionOverlapsTool.inputSchema.required, ['path']);
    const inspectTileCollisionTool = toolsResponse.result.tools.find(
      (tool) => tool.name === 'inspect_tile_collision'
    );
    assert.ok(inspectTileCollisionTool);
    assert.deepEqual(inspectTileCollisionTool.inputSchema.required, ['path']);
    const inspectMovementBlockingTool = toolsResponse.result.tools.find(
      (tool) => tool.name === 'inspect_movement_blocking'
    );
    assert.ok(inspectMovementBlockingTool);
    assert.deepEqual(inspectMovementBlockingTool.inputSchema.required, ['path', 'inputIntentPath']);
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'simulate_state'));

    const callResponse = await client.request('tools/call', {
      name: 'validate_scene',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(callResponse.result.isError, false);
    assert.equal(callResponse.result.structuredContent.sceneValidationReportVersion, 1);
    assert.equal(callResponse.result.structuredContent.valid, true);
    assert.equal(callResponse.result.structuredContent.scene, 'tutorial');
    assert.equal(callResponse.result.structuredContent.errors.length, 0);
    assert.deepEqual(
      callResponse.result.structuredContent.systems.map((system) => [system.name, system.known, system.delta]),
      [
        ['core.loop', true, 1],
        ['input.keyboard', true, 3],
        ['networking.replication', true, 2]
      ]
    );

    const validInputIntentResponse = await client.request('tools/call', {
      name: 'validate_input_intent',
      arguments: {
        path: './fixtures/input/valid.move.intent.json'
      }
    });

    const expectedInputIntentKeys = [
      'absolutePath',
      'errors',
      'inputIntent',
      'ok'
    ];

    assert.equal(validInputIntentResponse.result.isError, false);
    assert.deepEqual(
      Object.keys(validInputIntentResponse.result.structuredContent).sort(),
      expectedInputIntentKeys
    );
    assert.equal(
      validInputIntentResponse.result.structuredContent.absolutePath,
      path.join(repoRoot, 'fixtures', 'input', 'valid.move.intent.json')
    );
    assert.equal(validInputIntentResponse.result.structuredContent.ok, true);
    assert.deepEqual(validInputIntentResponse.result.structuredContent.errors, []);
    assert.deepEqual(validInputIntentResponse.result.structuredContent.inputIntent, {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player',
      actions: [
        {
          type: 'move',
          axis: {
            x: 1,
            y: 0
          }
        },
        {
          type: 'move',
          axis: {
            x: 0,
            y: -1
          }
        }
      ]
    });

    const invalidInputIntentResponse = await client.request('tools/call', {
      name: 'validate_input_intent',
      arguments: {
        path: './fixtures/input/invalid.missing-entity.intent.json'
      }
    });

    assert.equal(invalidInputIntentResponse.result.isError, true);
    assert.deepEqual(
      Object.keys(invalidInputIntentResponse.result.structuredContent).sort(),
      expectedInputIntentKeys
    );
    assert.equal(invalidInputIntentResponse.result.structuredContent.ok, false);
    assert.ok(
      invalidInputIntentResponse.result.structuredContent.errors.some(
        (error) => error.path === '$.entityId' && error.message === 'is required'
      )
    );

    const keyboardInputIntentResponse = await client.request('tools/call', {
      name: 'keyboard_to_input_intent',
      arguments: {
        tick: 1,
        entityId: 'player',
        keys: ['ArrowRight', 'ArrowUp']
      }
    });

    assert.equal(keyboardInputIntentResponse.result.isError, false);
    assert.deepEqual(keyboardInputIntentResponse.result.structuredContent, {
      inputIntentVersion: 1,
      tick: 1,
      entityId: 'player',
      actions: [
        {
          type: 'move',
          axis: {
            x: 1,
            y: -1
          }
        }
      ]
    });

    const keyboardInputIntentInvalidResponse = await client.request('tools/call', {
      name: 'keyboard_to_input_intent',
      arguments: {
        tick: 1,
        entityId: 'player',
        keys: []
      }
    });

    assert.equal(keyboardInputIntentInvalidResponse.result.isError, true);
    assert.match(
      keyboardInputIntentInvalidResponse.result.content[0].text,
      /keyboard_to_input_intent: `keys` is required and must be a non-empty array of strings/
    );

    const validSaveResponse = await client.request('tools/call', {
      name: 'validate_save',
      arguments: {
        path: './fixtures/savegame/valid.savegame.json'
      }
    });

    assert.equal(validSaveResponse.result.isError, false);
    assert.equal(validSaveResponse.result.structuredContent.reportVersion, 1);
    assert.equal(validSaveResponse.result.structuredContent.ok, true);
    assert.equal(validSaveResponse.result.structuredContent.save.saveVersion, 1);
    assert.equal(validSaveResponse.result.structuredContent.save.contentVersion, 1);
    assert.equal(validSaveResponse.result.structuredContent.errors.length, 0);

    const invalidSaveResponse = await client.request('tools/call', {
      name: 'validate_save',
      arguments: {
        path: './fixtures/savegame/invalid.missing-checksum.savegame.json'
      }
    });

    assert.equal(invalidSaveResponse.result.isError, true);
    assert.equal(invalidSaveResponse.result.structuredContent.ok, false);
    assert.ok(
      invalidSaveResponse.result.structuredContent.errors.some(
        (error) => error.path === '$.checksum' && error.message === 'is required'
      )
    );

    const unsupportedVersionSaveResponse = await client.request('tools/call', {
      name: 'validate_save',
      arguments: {
        path: './fixtures/savegame/invalid.unsupported-version.savegame.json'
      }
    });

    assert.equal(unsupportedVersionSaveResponse.result.isError, true);
    assert.equal(unsupportedVersionSaveResponse.result.structuredContent.reportVersion, 1);
    assert.equal(unsupportedVersionSaveResponse.result.structuredContent.ok, false);
    assert.ok(
      unsupportedVersionSaveResponse.result.structuredContent.errors.some(
        (error) =>
          error.path === '$.saveVersion' &&
          error.message === 'unsupported saveVersion: 2; supported: 1'
      )
    );

    const snapshotResponseA = await client.request('tools/call', {
      name: 'emit_world_snapshot',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    const snapshotResponseB = await client.request('tools/call', {
      name: 'emit_world_snapshot',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(snapshotResponseA.result.isError, false);
    assert.equal(snapshotResponseA.result.structuredContent.snapshot.opcode, 'world.snapshot');
    assert.deepEqual(
      snapshotResponseA.result.structuredContent.snapshot,
      snapshotResponseB.result.structuredContent.snapshot
    );

    const renderSnapshotResponseA = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick: 4,
        width: 320,
        height: 180
      }
    });

    const renderSnapshotResponseB = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick: 4,
        width: 320,
        height: 180
      }
    });

    assert.equal(renderSnapshotResponseA.result.isError, false);
    assertRenderSnapshotV1(renderSnapshotResponseA.result.structuredContent);
    assert.equal(renderSnapshotResponseA.result.structuredContent.scene, 'tutorial');
    assert.equal(renderSnapshotResponseA.result.structuredContent.tick, 4);
    assert.deepEqual(
      renderSnapshotResponseA.result.structuredContent,
      renderSnapshotResponseB.result.structuredContent
    );

    const renderSnapshotWithManifestResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/valid.asset-manifest.json'
      }
    });

    assert.equal(renderSnapshotWithManifestResponse.result.isError, false);
    assertRenderSnapshotV1(renderSnapshotWithManifestResponse.result.structuredContent);
    assert.deepEqual(renderSnapshotWithManifestResponse.result.structuredContent.drawCalls, [
      {
        kind: 'sprite',
        id: 'camera.icon',
        assetId: 'camera.icon',
        assetSrc: 'images/camera-icon.png',
        x: 6,
        y: 2,
        width: 16,
        height: 16,
        layer: 0
      },
      {
        kind: 'sprite',
        id: 'player.hero',
        assetId: 'player.sprite',
        assetSrc: 'images/player.png',
        x: 10,
        y: 12,
        width: 16,
        height: 16,
        layer: 1
      }
    ]);

    const renderSnapshotVisualSpriteResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/assets/visual-sprite.scene.json',
        assetManifestPath: './fixtures/assets/visual-sprite.asset-manifest.json'
      }
    });

    assert.equal(renderSnapshotVisualSpriteResponse.result.isError, false);
    assertRenderSnapshotV1(renderSnapshotVisualSpriteResponse.result.structuredContent);
    assert.deepEqual(Object.keys(renderSnapshotVisualSpriteResponse.result.structuredContent).sort(), [
      'drawCalls',
      'renderSnapshotVersion',
      'scene',
      'tick',
      'viewport'
    ]);
    assert.deepEqual(renderSnapshotVisualSpriteResponse.result.structuredContent.drawCalls, [
      {
        kind: 'sprite',
        id: 'player.hero',
        assetId: 'player.sprite',
        assetSrc: 'images/player.png',
        x: 10,
        y: 12,
        width: 20,
        height: 24,
        layer: 2
      }
    ]);

    const renderSnapshotTileLayerResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/tile-layer.scene.json'
      }
    });

    assert.equal(renderSnapshotTileLayerResponse.result.isError, false);
    assertRenderSnapshotV1(renderSnapshotTileLayerResponse.result.structuredContent);
    assert.deepEqual(Object.keys(renderSnapshotTileLayerResponse.result.structuredContent).sort(), [
      'drawCalls',
      'renderSnapshotVersion',
      'scene',
      'tick',
      'viewport'
    ]);
    assert.equal(renderSnapshotTileLayerResponse.result.structuredContent.scene, 'tile-layer-fixture');
    assert.equal(renderSnapshotTileLayerResponse.result.structuredContent.drawCalls.length, 10);
    assert.deepEqual(
      renderSnapshotTileLayerResponse.result.structuredContent.drawCalls.map((drawCall) => drawCall.id),
      [
        'map.ground.tile.0.0',
        'map.ground.tile.0.1',
        'map.ground.tile.0.2',
        'map.ground.tile.0.3',
        'map.ground.tile.1.0',
        'map.ground.tile.1.3',
        'map.ground.tile.2.0',
        'map.ground.tile.2.1',
        'map.ground.tile.2.2',
        'map.ground.tile.2.3'
      ]
    );
    assert.deepEqual(renderSnapshotTileLayerResponse.result.structuredContent.drawCalls[0], {
      kind: 'rect',
      id: 'map.ground.tile.0.0',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
      layer: -10
    });
    assert.deepEqual(renderSnapshotTileLayerResponse.result.structuredContent.drawCalls[9], {
      kind: 'rect',
      id: 'map.ground.tile.2.3',
      x: 48,
      y: 32,
      width: 16,
      height: 16,
      layer: -10
    });

    const renderSnapshotInvalidVisualSpriteResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './engine/runtime/test/fixtures/invalid_visual_sprite_asset_id.scene.json',
        assetManifestPath: './fixtures/assets/visual-sprite.asset-manifest.json'
      }
    });

    assert.equal(renderSnapshotInvalidVisualSpriteResponse.result.isError, true);
    assert.equal(renderSnapshotInvalidVisualSpriteResponse.result.structuredContent.ok, false);
    assert.equal(renderSnapshotInvalidVisualSpriteResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(
      renderSnapshotInvalidVisualSpriteResponse.result.content[0].text,
      /Scene validation failed for/
    );
    assert.match(
      renderSnapshotInvalidVisualSpriteResponse.result.structuredContent.errorMessage,
      /invalid_visual_sprite_asset_id\.scene\.json/
    );

    const renderSnapshotInvalidTileLayerResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './engine/runtime/test/fixtures/invalid_tile_layer_unknown_palette.scene.json'
      }
    });

    assert.equal(renderSnapshotInvalidTileLayerResponse.result.isError, true);
    assert.equal(renderSnapshotInvalidTileLayerResponse.result.structuredContent.ok, false);
    assert.equal(renderSnapshotInvalidTileLayerResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(
      renderSnapshotInvalidTileLayerResponse.result.content[0].text,
      /Scene validation failed for/
    );
    assert.match(
      renderSnapshotInvalidTileLayerResponse.result.structuredContent.errorMessage,
      /invalid_tile_layer_unknown_palette\.scene\.json/
    );

    const renderSnapshotMissingManifestResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/missing.asset-manifest.json'
      }
    });

    assert.equal(renderSnapshotMissingManifestResponse.result.isError, true);
    assert.equal(renderSnapshotMissingManifestResponse.result.structuredContent.ok, false);
    assert.equal(renderSnapshotMissingManifestResponse.result.structuredContent.errorName, 'Error');
    assert.match(renderSnapshotMissingManifestResponse.result.content[0].text, /ENOENT: no such file or directory/);
    assert.match(
      renderSnapshotMissingManifestResponse.result.structuredContent.errorMessage,
      /missing\.asset-manifest\.json/
    );

    const renderSnapshotInvalidManifestResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/invalid.non-positive-size.asset-manifest.json'
      }
    });

    assert.equal(renderSnapshotInvalidManifestResponse.result.isError, true);
    assert.equal(renderSnapshotInvalidManifestResponse.result.structuredContent.ok, false);
    assert.equal(renderSnapshotInvalidManifestResponse.result.structuredContent.errorName, 'AssetManifestValidationError');
    assert.match(
      renderSnapshotInvalidManifestResponse.result.content[0].text,
      /asset manifest is invalid:/
    );
    assert.match(
      renderSnapshotInvalidManifestResponse.result.structuredContent.errorMessage,
      /\$\.assets\[0\]\.width: must be >= 1/
    );
    assert.match(
      renderSnapshotInvalidManifestResponse.result.structuredContent.errorMessage,
      /\$\.assets\[0\]\.height: must be >= 1/
    );

    const renderSnapshotMissingAssetIdResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/valid.camera-only.asset-manifest.json'
      }
    });

    assert.equal(renderSnapshotMissingAssetIdResponse.result.isError, true);
    assert.equal(renderSnapshotMissingAssetIdResponse.result.structuredContent.ok, false);
    assert.equal(renderSnapshotMissingAssetIdResponse.result.structuredContent.errorName, 'Error');
    assert.match(
      renderSnapshotMissingAssetIdResponse.result.content[0].text,
      /buildRenderSnapshotV1: entity `player\.hero` references unknown assetId `player\.sprite`/
    );
    assert.match(
      renderSnapshotMissingAssetIdResponse.result.structuredContent.errorMessage,
      /references unknown assetId `player\.sprite`/
    );

    const renderSvgResponseA = await client.request('tools/call', {
      name: 'render_svg',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick: 4,
        width: 320,
        height: 180
      }
    });

    const renderSvgResponseB = await client.request('tools/call', {
      name: 'render_svg',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick: 4,
        width: 320,
        height: 180
      }
    });

    assert.equal(renderSvgResponseA.result.isError, false);
    assert.deepEqual(
      Object.keys(renderSvgResponseA.result.structuredContent).sort(),
      ['scene', 'svg', 'svgVersion', 'tick']
    );
    assert.equal(renderSvgResponseA.result.structuredContent.svgVersion, 1);
    assert.equal(renderSvgResponseA.result.structuredContent.scene, 'tutorial');
    assert.equal(renderSvgResponseA.result.structuredContent.tick, 4);
    assert.match(renderSvgResponseA.result.structuredContent.svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(renderSvgResponseA.result.structuredContent.svg, /<rect id="camera\.main"/);
    assert.match(renderSvgResponseA.result.structuredContent.svg, /<rect id="player\.hero"/);
    assert.deepEqual(renderSvgResponseA.result.structuredContent, renderSvgResponseB.result.structuredContent);

    const renderSvgInvalidVisualSpriteResponse = await client.request('tools/call', {
      name: 'render_svg',
      arguments: {
        path: './engine/runtime/test/fixtures/invalid_visual_sprite_asset_id.scene.json'
      }
    });

    assert.equal(renderSvgInvalidVisualSpriteResponse.result.isError, true);
    assert.equal(renderSvgInvalidVisualSpriteResponse.result.structuredContent.ok, false);
    assert.equal(renderSvgInvalidVisualSpriteResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(
      renderSvgInvalidVisualSpriteResponse.result.content[0].text,
      /Scene validation failed for/
    );
    assert.match(
      renderSvgInvalidVisualSpriteResponse.result.structuredContent.errorMessage,
      /invalid_visual_sprite_asset_id\.scene\.json/
    );

    const renderBrowserDemoResponseA = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick: 4,
        width: 320,
        height: 180
      }
    });

    const renderBrowserDemoResponseB = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './scenes/tutorial.scene.json',
        tick: 4,
        width: 320,
        height: 180
      }
    });

    assert.equal(renderBrowserDemoResponseA.result.isError, false);
    assertBrowserDemoStructuredContent(renderBrowserDemoResponseA.result.structuredContent);
    assertBrowserDemoStructuredContent(renderBrowserDemoResponseB.result.structuredContent);
    assert.deepEqual(
      renderBrowserDemoResponseA.result.structuredContent,
      renderBrowserDemoResponseB.result.structuredContent
    );

    const renderBrowserDemoWithManifestResponseA = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        tick: 4,
        assetManifestPath: './fixtures/assets/valid.asset-manifest.json'
      }
    });

    const renderBrowserDemoWithManifestResponseB = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        tick: 4,
        assetManifestPath: './fixtures/assets/valid.asset-manifest.json'
      }
    });

    assertBrowserDemoStructuredContentWithAssetLoading(renderBrowserDemoWithManifestResponseA.result.structuredContent);
    assertBrowserDemoStructuredContentWithAssetLoading(renderBrowserDemoWithManifestResponseB.result.structuredContent);
    assert.deepEqual(
      renderBrowserDemoWithManifestResponseA.result.structuredContent,
      renderBrowserDemoWithManifestResponseB.result.structuredContent
    );

    const renderBrowserDemoInvalidVisualSpriteResponse = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './engine/runtime/test/fixtures/invalid_visual_sprite_asset_id.scene.json',
        assetManifestPath: './fixtures/assets/visual-sprite.asset-manifest.json'
      }
    });

    assert.equal(renderBrowserDemoInvalidVisualSpriteResponse.result.isError, true);
    assert.equal(renderBrowserDemoInvalidVisualSpriteResponse.result.structuredContent.ok, false);
    assert.equal(renderBrowserDemoInvalidVisualSpriteResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(
      renderBrowserDemoInvalidVisualSpriteResponse.result.content[0].text,
      /Scene validation failed for/
    );
    assert.match(
      renderBrowserDemoInvalidVisualSpriteResponse.result.structuredContent.errorMessage,
      /invalid_visual_sprite_asset_id\.scene\.json/
    );

    const renderBrowserDemoWithManifestInvalidResponse = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/missing.asset-manifest.json'
      }
    });

    assert.equal(renderBrowserDemoWithManifestInvalidResponse.result.isError, true);
    assert.match(
      renderBrowserDemoWithManifestInvalidResponse.result.content[0].text,
      /ENOENT: no such file or directory/
    );

    const renderBrowserDemoWithManifestInvalidFormatResponse = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/invalid.non-positive-size.asset-manifest.json'
      }
    });

    assert.equal(renderBrowserDemoWithManifestInvalidFormatResponse.result.isError, true);
    assert.match(
      renderBrowserDemoWithManifestInvalidFormatResponse.result.content[0].text,
      /asset manifest is invalid:/
    );

    const renderBrowserDemoWithManifestTraversalResponse = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './fixtures/assets/sprite.scene.json',
        assetManifestPath: './fixtures/assets/invalid.traversal-src.asset-manifest.json'
      }
    });

    assert.equal(renderBrowserDemoWithManifestTraversalResponse.result.isError, true);
    assert.equal(
      renderBrowserDemoWithManifestTraversalResponse.result.structuredContent.errorName,
      'AssetManifestValidationError'
    );
    assert.match(
      renderBrowserDemoWithManifestTraversalResponse.result.content[0].text,
      /asset manifest is invalid:/
    );
    assert.match(
      renderBrowserDemoWithManifestTraversalResponse.result.structuredContent.errorMessage,
      /\$\.assets\[0\]\.src: must stay inside the manifest directory/
    );

    const renderBrowserDemoInvalidWidthResponse = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './scenes/tutorial.scene.json',
        width: 0
      }
    });

    assert.equal(renderBrowserDemoInvalidWidthResponse.result.isError, true);
    assert.match(
      renderBrowserDemoInvalidWidthResponse.result.content[0].text,
      /render_browser_demo: `width` must be an integer >= 1 when provided/
    );

    const renderBrowserDemoInvalidHeightResponse = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './scenes/tutorial.scene.json',
        height: 0
      }
    });

    assert.equal(renderBrowserDemoInvalidHeightResponse.result.isError, true);
    assert.match(
      renderBrowserDemoInvalidHeightResponse.result.content[0].text,
      /render_browser_demo: `height` must be an integer >= 1 when provided\./
    );

    const renderBrowserDemoMissingPathResponse = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: './scenes/does-not-exist.scene.json'
      }
    });

    assert.equal(renderBrowserDemoMissingPathResponse.result.isError, true);
    assert.equal(renderBrowserDemoMissingPathResponse.result.structuredContent.ok, false);
    assert.equal(renderBrowserDemoMissingPathResponse.result.structuredContent.errorName, 'Error');
    assert.match(
      renderBrowserDemoMissingPathResponse.result.content[0].text,
      /ENOENT: no such file or directory/
    );
    assert.match(
      renderBrowserDemoMissingPathResponse.result.structuredContent.errorMessage,
      /does-not-exist\.scene\.json/
    );

    const replayResponseA = await client.request('tools/call', {
      name: 'run_replay',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3,
        seed: 42
      }
    });

    const replayResponseB = await client.request('tools/call', {
      name: 'run_replay',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3,
        seed: 42
      }
    });

    const expectedReplayKeys = [
      'ciPayloadVersion',
      'replaySignature',
      'scene',
      'seed',
      'snapshotOpcode',
      'ticks'
    ];

    assert.equal(replayResponseA.result.isError, false);
    assert.deepEqual(
      Object.keys(replayResponseA.result.structuredContent).sort(),
      expectedReplayKeys
    );
    assert.equal(replayResponseA.result.structuredContent.ciPayloadVersion, 1);
    assert.equal(replayResponseA.result.structuredContent.snapshotOpcode, 'world.snapshot');
    assert.equal(typeof replayResponseA.result.structuredContent.replaySignature, 'string');
    assert.ok(replayResponseA.result.structuredContent.replaySignature.length > 0);
    assert.deepEqual(
      replayResponseA.result.structuredContent,
      replayResponseB.result.structuredContent
    );

    const runLoopWithSeedA = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 4,
        seed: 10
      }
    });

    const runLoopWithSeedB = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 4,
        seed: 10
      }
    });

    const expectedRunLoopKeys = [
      'executedSystems',
      'finalState',
      'loopReportVersion',
      'scene',
      'seed',
      'ticks',
      'ticksExecuted'
    ];

    assert.equal(runLoopWithSeedA.result.isError, false);
    assert.deepEqual(
      Object.keys(runLoopWithSeedA.result.structuredContent).sort(),
      expectedRunLoopKeys
    );
    assert.equal(runLoopWithSeedA.result.structuredContent.loopReportVersion, 1);
    assert.equal(runLoopWithSeedA.result.structuredContent.seed, 10);
    assert.equal(runLoopWithSeedA.result.structuredContent.ticksExecuted, 4);
    assert.equal(runLoopWithSeedA.result.structuredContent.finalState, 34);
    assert.deepEqual(
      runLoopWithSeedA.result.structuredContent,
      runLoopWithSeedB.result.structuredContent
    );

    const runLoopWithKeyboardScriptA = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 2,
        seed: 10,
        keyboardScriptPath: './fixtures/input-script/valid.keyboard-input-script.json'
      }
    });

    const runLoopWithKeyboardScriptB = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 2,
        seed: 10,
        keyboardScriptPath: './fixtures/input-script/valid.keyboard-input-script.json'
      }
    });

    assert.equal(runLoopWithKeyboardScriptA.result.isError, false);
    assert.equal(runLoopWithKeyboardScriptA.result.structuredContent.loopReportVersion, 1);
    assert.equal(runLoopWithKeyboardScriptA.result.structuredContent.seed, 10);
    assert.equal(runLoopWithKeyboardScriptA.result.structuredContent.ticksExecuted, 2);
    assert.equal(runLoopWithKeyboardScriptA.result.structuredContent.finalState, 17);
    assert.deepEqual(
      runLoopWithKeyboardScriptA.result.structuredContent,
      runLoopWithKeyboardScriptB.result.structuredContent
    );

    const runLoopWithKeyboardScriptInvalid = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 2,
        seed: 10,
        keyboardScriptPath: './fixtures/input-script/invalid.duplicate-tick.keyboard-input-script.json'
      }
    });

    assert.equal(runLoopWithKeyboardScriptInvalid.result.isError, true);
    assert.equal(
      runLoopWithKeyboardScriptInvalid.result.structuredContent.errorName,
      'KeyboardInputScriptValidationError'
    );
    assert.match(
      runLoopWithKeyboardScriptInvalid.result.content[0].text,
      /keyboard input script is invalid/
    );
    assert.match(
      runLoopWithKeyboardScriptInvalid.result.content[0].text,
      /\$\.ticks\[1\]\.tick: must be unique/
    );

    const runLoopWithKeyboardScriptMissing = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 2,
        seed: 10,
        keyboardScriptPath: './fixtures/input-script/missing.keyboard-input-script.json'
      }
    });

    assert.equal(runLoopWithKeyboardScriptMissing.result.isError, true);
    assert.equal(runLoopWithKeyboardScriptMissing.result.structuredContent.errorName, 'Error');
    assert.match(
      runLoopWithKeyboardScriptMissing.result.content[0].text,
      /ENOENT: no such file or directory/
    );
    assert.match(
      runLoopWithKeyboardScriptMissing.result.content[0].text,
      /missing\.keyboard-input-script\.json/
    );

    const runLoopDefaultSeedA = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 4
      }
    });

    const runLoopDefaultSeedB = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 4
      }
    });

    assert.equal(runLoopDefaultSeedA.result.isError, false);
    assert.deepEqual(
      Object.keys(runLoopDefaultSeedA.result.structuredContent).sort(),
      expectedRunLoopKeys
    );
    assert.equal(runLoopDefaultSeedA.result.structuredContent.loopReportVersion, 1);
    assert.equal(runLoopDefaultSeedA.result.structuredContent.seed, 1337);
    assert.equal(runLoopDefaultSeedA.result.structuredContent.ticksExecuted, 4);
    assert.equal(runLoopDefaultSeedA.result.structuredContent.finalState, 1361);
    assert.deepEqual(
      runLoopDefaultSeedA.result.structuredContent,
      runLoopDefaultSeedB.result.structuredContent
    );

    const runLoopWithIntentA = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 4,
        seed: 10,
        inputIntentPath: './fixtures/input/valid.move.intent.json'
      }
    });

    const runLoopWithIntentB = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 4,
        seed: 10,
        inputIntentPath: './fixtures/input/valid.move.intent.json'
      }
    });

    assert.equal(runLoopWithIntentA.result.isError, false);
    assert.deepEqual(
      Object.keys(runLoopWithIntentA.result.structuredContent).sort(),
      expectedRunLoopKeys
    );
    assert.equal(runLoopWithIntentA.result.structuredContent.loopReportVersion, 1);
    assert.equal(runLoopWithIntentA.result.structuredContent.seed, 10);
    assert.equal(runLoopWithIntentA.result.structuredContent.ticksExecuted, 4);
    assert.equal(runLoopWithIntentA.result.structuredContent.finalState, 31);
    assert.deepEqual(
      runLoopWithIntentA.result.structuredContent,
      runLoopWithIntentB.result.structuredContent
    );

    const runLoopWithMovementBlockingBlockedA = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-loop-blocked.scene.json',
        ticks: 1,
        seed: 40,
        movementBlocking: true,
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    const runLoopWithMovementBlockingBlockedNoFlag = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-loop-blocked.scene.json',
        ticks: 1,
        seed: 40,
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    const runLoopWithMovementBlockingOpen = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-loop-open.scene.json',
        ticks: 1,
        seed: 40,
        movementBlocking: true,
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });
    const runLoopWithMovementBlockingOpenNoFlag = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-loop-open.scene.json',
        ticks: 1,
        seed: 40,
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    const runLoopWithMovementBlockingNonSolid = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-loop-non-solid.scene.json',
        ticks: 1,
        seed: 40,
        movementBlocking: true,
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    assert.equal(runLoopWithMovementBlockingBlockedA.result.isError, false);
    assert.equal(runLoopWithMovementBlockingBlockedNoFlag.result.isError, false);
    assert.equal(runLoopWithMovementBlockingOpen.result.isError, false);
    assert.equal(runLoopWithMovementBlockingOpenNoFlag.result.isError, false);
    assert.equal(runLoopWithMovementBlockingNonSolid.result.isError, false);
    assert.equal(
      runLoopWithMovementBlockingBlockedNoFlag.result.structuredContent.finalState - 1,
      runLoopWithMovementBlockingBlockedA.result.structuredContent.finalState
    );
    assert.equal(
      runLoopWithMovementBlockingOpen.result.structuredContent.finalState,
      runLoopWithMovementBlockingOpenNoFlag.result.structuredContent.finalState
    );
    assert.equal(
      runLoopWithMovementBlockingNonSolid.result.structuredContent.finalState,
      runLoopWithMovementBlockingOpenNoFlag.result.structuredContent.finalState
    );

    const runLoopWithMovementBlockingInvalid = await client.request('tools/call', {
      name: 'run_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 1,
        movementBlocking: 'yes',
        inputIntentPath: './fixtures/input/valid.move.intent.json'
      }
    });

    assert.equal(runLoopWithMovementBlockingInvalid.result.isError, true);
    assert.match(
      runLoopWithMovementBlockingInvalid.result.content[0].text,
      /movementBlocking/
    );

    const simulateStateNoTraceResponse = await client.request('tools/call', {
      name: 'simulate_state',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10
      }
    });

    assert.equal(simulateStateNoTraceResponse.result.isError, false);
    assert.deepEqual(
      Object.keys(simulateStateNoTraceResponse.result.structuredContent).sort(),
      [
        'finalSnapshot',
        'initialSnapshot',
        'processors',
        'scene',
        'seed',
        'stateSimulationReportVersion',
        'steps',
        'ticks',
        'ticksExecuted'
      ]
    );
    assert.equal(simulateStateNoTraceResponse.result.structuredContent.stateSimulationReportVersion, 1);
    assert.equal(
      simulateStateNoTraceResponse.result.structuredContent.finalSnapshot.entities[0].components.transform.fields.x,
      6
    );
    assert.equal(
      simulateStateNoTraceResponse.result.structuredContent.finalSnapshot.entities[0].components.transform.fields.y,
      9
    );

    const simulateStateTraceResponseA = await client.request('tools/call', {
      name: 'simulate_state',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        trace: true
      }
    });

    const simulateStateTraceResponseB = await client.request('tools/call', {
      name: 'simulate_state',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        trace: true
      }
    });

    assert.equal(simulateStateTraceResponseA.result.isError, false);
    assert.deepEqual(
      Object.keys(simulateStateTraceResponseA.result.structuredContent).sort(),
      ['mutationTrace', 'report']
    );
    assert.deepEqual(
      simulateStateTraceResponseA.result.structuredContent,
      simulateStateTraceResponseB.result.structuredContent
    );
    assert.equal(
      simulateStateTraceResponseA.result.structuredContent.report.stateSimulationReportVersion,
      1
    );
    assert.equal(
      simulateStateTraceResponseA.result.structuredContent.report.finalSnapshot.entities[0].components.transform.fields.x,
      6
    );
    assert.equal(
      simulateStateTraceResponseA.result.structuredContent.report.finalSnapshot.entities[0].components.transform.fields.y,
      9
    );

    const trace = simulateStateTraceResponseA.result.structuredContent.mutationTrace;
    assert.equal(trace.stateMutationTraceVersion, 1);
    assert.equal(trace.ticks, 3);
    assert.equal(trace.mutationsByTick.length, 3);
    for (const tick of trace.mutationsByTick) {
      assert.ok(
        tick.processors.some(
          (processor) =>
            processor.name === 'movement.integrate' &&
            processor.mutations.some(
              (mutation) =>
                mutation.component === 'transform' &&
                mutation.fieldsChanged.includes('x') &&
                mutation.fieldsChanged.includes('y')
            )
        )
      );
    }

    const planLoopResponse = await client.request('tools/call', {
      name: 'plan_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 4,
        seed: 10
      }
    });

    assert.equal(planLoopResponse.result.isError, false);
    assert.equal(planLoopResponse.result.structuredContent.executionPlanVersion, 1);
    assert.equal(planLoopResponse.result.structuredContent.valid, true);
    assert.equal(planLoopResponse.result.structuredContent.estimated.finalState, 34);
    assert.equal(planLoopResponse.result.structuredContent.systemsPerTick.length, 4);

    const replayArtifactResponseA = await client.request('tools/call', {
      name: 'run_replay_artifact',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3,
        seed: 42
      }
    });

    const replayArtifactResponseB = await client.request('tools/call', {
      name: 'run_replay_artifact',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3,
        seed: 42
      }
    });

    const expectedArtifactKeys = [
      'executedSystemCount',
      'finalState',
      'replayArtifactVersion',
      'replaySignature',
      'scene',
      'seed',
      'snapshotOpcode',
      'ticks'
    ];

    assert.equal(replayArtifactResponseA.result.isError, false);
    assert.deepEqual(
      Object.keys(replayArtifactResponseA.result.structuredContent).sort(),
      expectedArtifactKeys
    );
    assert.equal(replayArtifactResponseA.result.structuredContent.replayArtifactVersion, 1);
    assert.equal(replayArtifactResponseA.result.structuredContent.snapshotOpcode, 'world.snapshot');
    assert.deepEqual(
      replayArtifactResponseA.result.structuredContent,
      replayArtifactResponseB.result.structuredContent
    );

    const missingTicksResponse = await client.request('tools/call', {
      name: 'run_replay',
      arguments: {
        path: './scenes/tutorial.scene.json',
        seed: 42
      }
    });

    assert.equal(missingTicksResponse.result.isError, true);
    assert.match(
      missingTicksResponse.result.content[0].text,
      /run_replay: `ticks` is required and must be an integer >= 0/
    );

    const invalidTicksResponse = await client.request('tools/call', {
      name: 'run_replay',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 'abc',
        seed: 42
      }
    });

    assert.equal(invalidTicksResponse.result.isError, true);
    assert.match(
      invalidTicksResponse.result.content[0].text,
      /run_replay: `ticks` is required and must be an integer >= 0/
    );

    const invalidSeedResponse = await client.request('tools/call', {
      name: 'run_replay',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3,
        seed: 'not-an-integer'
      }
    });

    assert.equal(invalidSeedResponse.result.isError, true);
    assert.match(
      invalidSeedResponse.result.content[0].text,
      /run_replay: `seed` must be an integer when provided/
    );

    const artifactMissingTicksResponse = await client.request('tools/call', {
      name: 'run_replay_artifact',
      arguments: {
        path: './scenes/tutorial.scene.json',
        seed: 42
      }
    });

    assert.equal(artifactMissingTicksResponse.result.isError, true);
    assert.match(
      artifactMissingTicksResponse.result.content[0].text,
      /run_replay_artifact: `ticks` is required and must be an integer >= 0/
    );

    const invalidPathResponse = await client.request('tools/call', {
      name: 'run_replay',
      arguments: {
        path: '/tmp/outside.scene.json',
        ticks: 3,
        seed: 42
      }
    });

    assert.equal(invalidPathResponse.result.isError, true);
    assert.match(
      invalidPathResponse.result.content[0].text,
      /run_replay: path must stay inside the repository root/
    );
  } finally {
    await client.close();
  }
});

test('mcp render_snapshot preserves camera viewport offsets and fails predictably for invalid camera scenes', async () => {
  const client = createClient();

  try {
    const initResponse = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    client.notify('notifications/initialized');

    const cameraSnapshotResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './engine/runtime/test/fixtures/camera-viewport.scene.json',
        assetManifestPath: './fixtures/assets/visual-sprite.asset-manifest.json'
      }
    });

    assert.equal(cameraSnapshotResponse.result.isError, false);
    assertRenderSnapshotV1(cameraSnapshotResponse.result.structuredContent);
    assert.deepEqual(cameraSnapshotResponse.result.structuredContent.viewport, {
      width: 160,
      height: 90
    });
    assert.deepEqual(cameraSnapshotResponse.result.structuredContent.drawCalls, [
      {
        kind: 'rect',
        id: 'map.ground.tile.0.0',
        x: -8,
        y: -4,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.0.1',
        x: 8,
        y: -4,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'rect',
        id: 'map.ground.tile.1.0',
        x: -8,
        y: 12,
        width: 16,
        height: 16,
        layer: -10
      },
      {
        kind: 'sprite',
        id: 'player.hero',
        assetId: 'player.sprite',
        assetSrc: 'images/player.png',
        x: 22,
        y: 36,
        width: 20,
        height: 24,
        layer: 2
      }
    ]);

    const invalidCameraResponse = await client.request('tools/call', {
      name: 'render_snapshot',
      arguments: {
        path: './engine/runtime/test/fixtures/invalid_camera_viewport_x.scene.json'
      }
    });

    assert.equal(invalidCameraResponse.result.isError, true);
    assert.equal(invalidCameraResponse.result.structuredContent.ok, false);
    assert.equal(invalidCameraResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(invalidCameraResponse.result.content[0].text, /Scene validation failed for/);
    assert.match(invalidCameraResponse.result.structuredContent.errorMessage, /invalid_camera_viewport_x\.scene\.json/);
  } finally {
    await client.close();
  }
});

test('mcp inspect_collision_bounds returns deterministic bounds and empty reports', async () => {
  const client = createClient();

  try {
    const initResponse = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    client.notify('notifications/initialized');

    const boundsResponse = await client.request('tools/call', {
      name: 'inspect_collision_bounds',
      arguments: {
        path: './engine/runtime/test/fixtures/collision-bounds.scene.json'
      }
    });

    assert.equal(boundsResponse.result.isError, false);
    assert.deepEqual(boundsResponse.result.structuredContent, {
      collisionBoundsReportVersion: 1,
      scene: 'collision-bounds-fixture',
      bounds: [
        {
          entityId: 'player.hero',
          x: 12,
          y: 15,
          width: 12,
          height: 14,
          solid: true
        },
        {
          entityId: 'wall.block',
          x: 40,
          y: 8,
          width: 16,
          height: 32,
          solid: true
        }
      ]
    });

    const emptyResponse = await client.request('tools/call', {
      name: 'inspect_collision_bounds',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(emptyResponse.result.isError, false);
    assert.deepEqual(emptyResponse.result.structuredContent, {
      collisionBoundsReportVersion: 1,
      scene: 'tutorial',
      bounds: []
    });

    const invalidResponse = await client.request('tools/call', {
      name: 'inspect_collision_bounds',
      arguments: {
        path: './engine/runtime/test/fixtures/invalid_collision_bounds.scene.json'
      }
    });

    assert.equal(invalidResponse.result.isError, true);
    assert.equal(invalidResponse.result.structuredContent.ok, false);
    assert.equal(invalidResponse.result.structuredContent.errorName, 'SceneValidationError');
    assert.match(invalidResponse.result.structuredContent.errorMessage, /invalid_collision_bounds\.scene\.json/);
  } finally {
    await client.close();
  }
});

test('mcp inspect_collision_overlaps returns deterministic overlaps and empty reports', async () => {
  const client = createClient();

  try {
    const initResponse = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    client.notify('notifications/initialized');

    const overlapsResponse = await client.request('tools/call', {
      name: 'inspect_collision_overlaps',
      arguments: {
        path: './engine/runtime/test/fixtures/collision-overlap.scene.json'
      }
    });

    assert.equal(overlapsResponse.result.isError, false);
    assert.deepEqual(overlapsResponse.result.structuredContent, {
      collisionOverlapReportVersion: 1,
      scene: 'collision-overlap-fixture',
      overlaps: [
        {
          entityAId: 'ghost.zone',
          entityBId: 'player.hero',
          solid: false
        },
        {
          entityAId: 'player.hero',
          entityBId: 'wall.block',
          solid: true
        }
      ]
    });

    const emptyResponse = await client.request('tools/call', {
      name: 'inspect_collision_overlaps',
      arguments: {
        path: './engine/runtime/test/fixtures/collision-no-overlap.scene.json'
      }
    });

    assert.equal(emptyResponse.result.isError, false);
    assert.deepEqual(emptyResponse.result.structuredContent, {
      collisionOverlapReportVersion: 1,
      scene: 'collision-no-overlap-fixture',
      overlaps: []
    });
  } finally {
    await client.close();
  }
});

test('mcp inspect_tile_collision returns deterministic solid tiles and empty reports', async () => {
  const client = createClient();

  try {
    const initResponse = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    client.notify('notifications/initialized');

    const solidResponse = await client.request('tools/call', {
      name: 'inspect_tile_collision',
      arguments: {
        path: './engine/runtime/test/fixtures/tile-collision-solid.scene.json'
      }
    });

    assert.equal(solidResponse.result.isError, false);
    assert.deepEqual(solidResponse.result.structuredContent, {
      tileCollisionReportVersion: 1,
      scene: 'tile-collision-solid-fixture',
      tiles: [
        {
          tileId: 'map.walls.tile.0.0',
          layerEntityId: 'map.walls',
          row: 0,
          column: 0,
          paletteId: '1',
          x: 0,
          y: 0,
          width: 16,
          height: 16,
          solid: true
        },
        {
          tileId: 'map.walls.tile.0.2',
          layerEntityId: 'map.walls',
          row: 0,
          column: 2,
          paletteId: 'wall',
          x: 32,
          y: 0,
          width: 24,
          height: 24,
          solid: true
        },
        {
          tileId: 'map.walls.tile.1.1',
          layerEntityId: 'map.walls',
          row: 1,
          column: 1,
          paletteId: '1',
          x: 16,
          y: 16,
          width: 16,
          height: 16,
          solid: true
        }
      ]
    });

    const emptyResponse = await client.request('tools/call', {
      name: 'inspect_tile_collision',
      arguments: {
        path: './engine/runtime/test/fixtures/tile-collision-empty.scene.json'
      }
    });

    assert.equal(emptyResponse.result.isError, false);
    assert.deepEqual(emptyResponse.result.structuredContent, {
      tileCollisionReportVersion: 1,
      scene: 'tile-collision-empty-fixture',
      tiles: []
    });
  } finally {
    await client.close();
  }
});

test('mcp inspect_movement_blocking returns blocked and unblocked reports', async () => {
  const client = createClient();

  try {
    const initResponse = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    client.notify('notifications/initialized');

    const blockedResponse = await client.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-blocked.scene.json',
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    assert.equal(blockedResponse.result.isError, false);
    assert.deepEqual(blockedResponse.result.structuredContent, {
      movementBlockingReportVersion: 1,
      scene: 'movement-blocking-blocked-fixture',
      entityId: 'player.hero',
      inputIntentTick: 1,
      attemptedMove: { x: 1, y: 0 },
      from: { x: 0, y: 0 },
      candidate: { x: 1, y: 0 },
      final: { x: 0, y: 0 },
      blocked: true,
      blockingEntities: ['wall.block']
    });

    const blockedByTileResponse = await client.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-tile-blocked.scene.json',
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    assert.equal(blockedByTileResponse.result.isError, false);
    assert.deepEqual(blockedByTileResponse.result.structuredContent.blockingEntities, ['map.walls.tile.0.1']);

    const unblockedResponse = await client.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-open.scene.json',
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    assert.equal(unblockedResponse.result.isError, false);
    assert.deepEqual(unblockedResponse.result.structuredContent, {
      movementBlockingReportVersion: 1,
      scene: 'movement-blocking-open-fixture',
      entityId: 'player.hero',
      inputIntentTick: 1,
      attemptedMove: { x: 1, y: 0 },
      from: { x: 0, y: 0 },
      candidate: { x: 1, y: 0 },
      final: { x: 1, y: 0 },
      blocked: false,
      blockingEntities: []
    });
  } finally {
    await client.close();
  }
});

test('mcp inspect_movement_blocking returns predictable errors for invalid inputs', async () => {
  const client = createClient();

  try {
    const initResponse = await client.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'node-test',
        version: '1.0.0'
      }
    });

    assert.equal(initResponse.result.protocolVersion, '2025-06-18');
    client.notify('notifications/initialized');

    const invalidInputIntentResponse = await client.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-blocked.scene.json',
        inputIntentPath: './fixtures/input/invalid.missing-entity.intent.json'
      }
    });

    assert.equal(invalidInputIntentResponse.result.isError, true);
    assert.equal(invalidInputIntentResponse.result.structuredContent.ok, false);
    assert.equal(invalidInputIntentResponse.result.structuredContent.errorName, 'InputIntentValidationError');
    assert.match(invalidInputIntentResponse.result.content[0].text, /input intent is invalid/);
    assert.match(invalidInputIntentResponse.result.content[0].text, /\$\.entityId: is required/);

    const missingInputIntentResponse = await client.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: {
        path: './engine/runtime/test/fixtures/movement-blocking-blocked.scene.json',
        inputIntentPath: './fixtures/input/missing-movement.intent.json'
      }
    });

    assert.equal(missingInputIntentResponse.result.isError, true);
    assert.equal(missingInputIntentResponse.result.structuredContent.ok, false);
    assert.equal(missingInputIntentResponse.result.structuredContent.errorName, 'Error');
    assert.match(missingInputIntentResponse.result.content[0].text, /ENOENT: no such file or directory/);
    assert.match(missingInputIntentResponse.result.content[0].text, /missing-movement\.intent\.json/);

    const missingSceneResponse = await client.request('tools/call', {
      name: 'inspect_movement_blocking',
      arguments: {
        path: './engine/runtime/test/fixtures/missing-movement.scene.json',
        inputIntentPath: './fixtures/input/move-player-right.intent.json'
      }
    });

    assert.equal(missingSceneResponse.result.isError, true);
    assert.equal(missingSceneResponse.result.structuredContent.ok, false);
    assert.equal(missingSceneResponse.result.structuredContent.errorName, 'Error');
    assert.match(missingSceneResponse.result.content[0].text, /ENOENT: no such file or directory/);
    assert.match(missingSceneResponse.result.content[0].text, /missing-movement\.scene\.json/);
  } finally {
    await client.close();
  }
});
