import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

test('mcp server lists tools and validates/describes a scene', async () => {
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
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'describe_scene'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_prefab'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_save'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_input'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'simulate_first_loop'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'benchmark_first_loop'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'replay_first_loop'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'verify_replay_determinism'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'playback_replay_artifact'));

    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_scene_assets'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'inspect_world'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'inspect_scene_hierarchy'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_ui'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_render'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_network'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'diff_network_snapshots'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'validate_network_sequence'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'simulate_network_replication'));


    const validateResponse = await client.request('tools/call', {
      name: 'validate_scene',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(validateResponse.result.isError, false);
    assert.equal(validateResponse.result.structuredContent.ok, true);
    assert.equal(validateResponse.result.structuredContent.summary.entityCount, 2);



    const validatePrefabResponse = await client.request('tools/call', {
      name: 'validate_prefab',
      arguments: {
        path: './engine/runtime/test/fixtures/prefabs/valid.hero.prefab.json'
      }
    });

    assert.equal(validatePrefabResponse.result.isError, false);
    assert.equal(validatePrefabResponse.result.structuredContent.ok, true);
    assert.equal(validatePrefabResponse.result.structuredContent.prefabId, 'hero.base');








    const replayResponse = await client.request('tools/call', {
      name: 'replay_first_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3
      }
    });

    assert.equal(replayResponse.result.isError, false);
    assert.equal(replayResponse.result.structuredContent.ok, true);
    assert.equal(replayResponse.result.structuredContent.report.frames.length, 3);
    assert.match(replayResponse.result.structuredContent.report.digest, /^djb2:/);

    const replayDeterminismResponse = await client.request('tools/call', {
      name: 'verify_replay_determinism',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3,
        runs: 3
      }
    });

    assert.equal(replayDeterminismResponse.result.isError, false);
    assert.equal(replayDeterminismResponse.result.structuredContent.ok, true);
    assert.equal(replayDeterminismResponse.result.structuredContent.report.uniqueDigestCount, 1);

    const replayArtifactPlaybackResponse = await client.request('tools/call', {
      name: 'playback_replay_artifact',
      arguments: {
        replayPath: './scenes/tutorial.firstloop.replay.json'
      }
    });

    assert.equal(replayArtifactPlaybackResponse.result.isError, false);
    assert.equal(replayArtifactPlaybackResponse.result.structuredContent.ok, true);
    assert.match(replayArtifactPlaybackResponse.result.structuredContent.actualDigest, /^djb2:/);

    const inputResponse = await client.request('tools/call', {
      name: 'validate_input',
      arguments: {
        path: './scenes/tutorial.input.json'
      }
    });

    assert.equal(inputResponse.result.isError, false);
    assert.equal(inputResponse.result.structuredContent.ok, true);
    assert.equal(inputResponse.result.structuredContent.actionCount, 3);

    const saveResponse = await client.request('tools/call', {
      name: 'validate_save',
      arguments: {
        path: './scenes/tutorial.save.json'
      }
    });

    assert.equal(saveResponse.result.isError, false);
    assert.equal(saveResponse.result.structuredContent.ok, true);
    assert.equal(saveResponse.result.structuredContent.scene, 'tutorial');



    const uiResponse = await client.request('tools/call', {
      name: 'validate_ui',
      arguments: {
        path: './scenes/tutorial.ui.json'
      }
    });

    assert.equal(uiResponse.result.isError, false);
    assert.equal(uiResponse.result.structuredContent.ok, true);
    assert.equal(uiResponse.result.structuredContent.screen, 'hud.main');



    const renderResponse = await client.request('tools/call', {
      name: 'validate_render',
      arguments: {
        path: './scenes/tutorial.render.json'
      }
    });

    assert.equal(renderResponse.result.isError, false);
    assert.equal(renderResponse.result.structuredContent.ok, true);
    assert.equal(renderResponse.result.structuredContent.backend, 'wgpu-like');


    const networkResponse = await client.request('tools/call', {
      name: 'validate_network',
      arguments: {
        path: './scenes/tutorial.netmsg.json'
      }
    });

    assert.equal(networkResponse.result.isError, false);
    assert.equal(networkResponse.result.structuredContent.ok, true);
    assert.equal(networkResponse.result.structuredContent.direction, 'server_to_client');


    const snapshotDiffResponse = await client.request('tools/call', {
      name: 'diff_network_snapshots',
      arguments: {
        beforePath: './scenes/tutorial.netmsg.json',
        afterPath: './scenes/tutorial.netmsg.tick43.json'
      }
    });

    assert.equal(snapshotDiffResponse.result.isError, false);
    assert.equal(snapshotDiffResponse.result.structuredContent.ok, true);
    assert.equal(snapshotDiffResponse.result.structuredContent.diff.toTick, 43);

    const snapshotSequenceResponse = await client.request('tools/call', {
      name: 'validate_network_sequence',
      arguments: {
        beforePath: './scenes/tutorial.netmsg.json',
        afterPath: './scenes/tutorial.netmsg.tick43.json'
      }
    });

    assert.equal(snapshotSequenceResponse.result.isError, false);
    assert.equal(snapshotSequenceResponse.result.structuredContent.ok, true);
    assert.equal(snapshotSequenceResponse.result.structuredContent.summary.tickDelta, 1);

    const replicationSimulationResponse = await client.request('tools/call', {
      name: 'simulate_network_replication',
      arguments: {
        paths: [
          './scenes/tutorial.netmsg.json',
          './scenes/tutorial.netmsg.tick43.json'
        ]
      }
    });

    assert.equal(replicationSimulationResponse.result.isError, false);
    assert.equal(replicationSimulationResponse.result.structuredContent.ok, true);
    assert.equal(replicationSimulationResponse.result.structuredContent.timeline.length, 2);


    const invalidSnapshotDiffArgs = await client.request('tools/call', {
      name: 'diff_network_snapshots',
      arguments: {
        beforePath: './scenes/tutorial.netmsg.json'
      }
    });

    assert.equal(invalidSnapshotDiffArgs.result.isError, true);
    assert.equal(invalidSnapshotDiffArgs.result.structuredContent, undefined);
    assert.match(invalidSnapshotDiffArgs.result.content[0].text, /beforePath.*afterPath/);

    const invalidPrefabResponse = await client.request('tools/call', {
      name: 'validate_prefab',
      arguments: {
        path: './engine/runtime/test/fixtures/prefabs/invalid.missing-components.prefab.json'
      }
    });

    assert.equal(invalidPrefabResponse.result.isError, true);
    assert.equal(invalidPrefabResponse.result.structuredContent.ok, false);
    assert.ok(Array.isArray(invalidPrefabResponse.result.structuredContent.errors));
    assert.ok(invalidPrefabResponse.result.structuredContent.errors.some((error) => error.path === '$.components'));





    const sceneAssetsResponse = await client.request('tools/call', {
      name: 'validate_scene_assets',
      arguments: {
        path: './scenes/tutorial.scene.json',
        manifestPath: './scenes/assets.manifest.json'
      }
    });

    assert.equal(sceneAssetsResponse.result.isError, false);
    assert.equal(sceneAssetsResponse.result.structuredContent.ok, true);
    assert.equal(sceneAssetsResponse.result.structuredContent.missingAssetRefs.length, 0);



    const invalidSceneAssetsResponse = await client.request('tools/call', {
      name: 'validate_scene_assets',
      arguments: {
        path: './scenes/tutorial.scene.json',
        manifestPath: './engine/runtime/test/fixtures/assets/missing-one.manifest.json'
      }
    });

    assert.equal(invalidSceneAssetsResponse.result.isError, true);
    assert.equal(invalidSceneAssetsResponse.result.structuredContent.ok, false);
    assert.equal(invalidSceneAssetsResponse.result.structuredContent.missingAssetRefs.length, 1);

    const loopResponse = await client.request('tools/call', {
      name: 'simulate_first_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 3
      }
    });

    assert.equal(loopResponse.result.isError, false);
    assert.equal(loopResponse.result.structuredContent.ok, true);
    assert.equal(loopResponse.result.structuredContent.report.ticks, 3);
    assert.equal(loopResponse.result.structuredContent.report.healthByEntity['player.hero'], 97);

    const benchmarkResponse = await client.request('tools/call', {
      name: 'benchmark_first_loop',
      arguments: {
        path: './scenes/tutorial.scene.json',
        ticks: 2,
        runs: 2
      }
    });

    assert.equal(benchmarkResponse.result.isError, false);
    assert.equal(benchmarkResponse.result.structuredContent.ok, true);
    assert.equal(benchmarkResponse.result.structuredContent.report.ticks, 2);
    assert.equal(benchmarkResponse.result.structuredContent.report.runs, 2);
    assert.equal(benchmarkResponse.result.structuredContent.report.metrics.durationsMs.length, 2);



    const worldResponse = await client.request('tools/call', {
      name: 'inspect_world',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(worldResponse.result.isError, false);
    assert.equal(worldResponse.result.structuredContent.ok, true);
    assert.equal(worldResponse.result.structuredContent.summary.entityCount, 2);
    assert.equal(worldResponse.result.structuredContent.summary.componentCount, 5);

    const filteredWorldResponse = await client.request('tools/call', {
      name: 'inspect_world',
      arguments: {
        path: './scenes/tutorial.scene.json',
        componentKind: 'health'
      }
    });

    assert.equal(filteredWorldResponse.result.isError, false);
    assert.equal(filteredWorldResponse.result.structuredContent.summary.entityCount, 1);
    assert.equal(filteredWorldResponse.result.structuredContent.summary.componentCount, 1);

    const systemFilteredWorldResponse = await client.request('tools/call', {
      name: 'inspect_world',
      arguments: {
        path: './scenes/tutorial.scene.json',
        systemName: 'ui.runtime'
      }
    });

    assert.equal(systemFilteredWorldResponse.result.isError, false);
    assert.equal(systemFilteredWorldResponse.result.structuredContent.summary.entityCount, 0);

    const hierarchyResponse = await client.request('tools/call', {
      name: 'inspect_scene_hierarchy',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(hierarchyResponse.result.isError, false);
    assert.equal(hierarchyResponse.result.structuredContent.ok, true);
    assert.equal(hierarchyResponse.result.structuredContent.report.entityCount, 2);
    assert.equal(hierarchyResponse.result.structuredContent.report.roots.length, 2);

    const filteredHierarchyResponse = await client.request('tools/call', {
      name: 'inspect_scene_hierarchy',
      arguments: {
        path: './scenes/tutorial.scene.json',
        componentKind: 'health'
      }
    });

    assert.equal(filteredHierarchyResponse.result.isError, false);
    assert.equal(filteredHierarchyResponse.result.structuredContent.report.entityCount, 1);
    assert.equal(filteredHierarchyResponse.result.structuredContent.report.roots.length, 1);

    const systemFilteredHierarchyResponse = await client.request('tools/call', {
      name: 'inspect_scene_hierarchy',
      arguments: {
        path: './scenes/tutorial.scene.json',
        systemName: 'ui.runtime'
      }
    });

    assert.equal(systemFilteredHierarchyResponse.result.isError, false);
    assert.equal(systemFilteredHierarchyResponse.result.structuredContent.report.entityCount, 0);
    assert.equal(systemFilteredHierarchyResponse.result.structuredContent.report.roots.length, 0);

    const describeResponse = await client.request('tools/call', {
      name: 'describe_scene',
      arguments: {
        path: './scenes/tutorial.scene.json'
      }
    });

    assert.equal(describeResponse.result.isError, false);
    assert.equal(describeResponse.result.structuredContent.ok, true);
    assert.equal(describeResponse.result.structuredContent.description.name, 'tutorial');
    assert.equal(describeResponse.result.structuredContent.description.entities.length, 2);
  } finally {
    await client.close();
  }
});
