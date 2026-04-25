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
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'run_loop'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'plan_loop'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'run_replay'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'run_replay_artifact'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'inspect_state'));
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
