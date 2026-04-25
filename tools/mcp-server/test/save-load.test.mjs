import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { canonicalJSONStringify } from '../../../engine/runtime/src/index.mjs';
import { assertStateSnapshotV1 } from '../../../engine/runtime/test/helpers/assertStateSnapshotV1.mjs';

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
    return new Promise((resolve) => {
      pending.set(id, { resolve });
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

async function initializeClient() {
  const client = createClient();
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
  return client;
}

async function createTempRepoDir(t) {
  const directory = await mkdtemp(path.join(repoRoot, '.tmp-mcp-save-load-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

function toRepoRelativePath(targetPath) {
  return path.relative(repoRoot, targetPath);
}

test('save_state_snapshot and load_save stay small and predictable on the happy path', async (t) => {
  const client = await initializeClient();
  const outDir = path.join(await createTempRepoDir(t), 'save');

  try {
    const toolsResponse = await client.request('tools/list');
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'save_state_snapshot'));
    assert.ok(toolsResponse.result.tools.some((tool) => tool.name === 'load_save'));

    const saveResponse = await client.request('tools/call', {
      name: 'save_state_snapshot',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        outDir: toRepoRelativePath(outDir)
      }
    });

    assert.equal(saveResponse.result.isError, false);
    assert.deepEqual(
      Object.keys(saveResponse.result.structuredContent).sort(),
      ['payloadPath', 'save', 'savePath']
    );
    assert.equal(saveResponse.result.structuredContent.save.saveVersion, 1);
    assert.equal(saveResponse.result.structuredContent.save.contentVersion, 1);
    assert.equal(saveResponse.result.structuredContent.save.seed, 10);
    assert.equal(saveResponse.result.structuredContent.save.payloadRef, 'state-snapshot-v1.payload.json');
    assert.match(saveResponse.result.structuredContent.save.checksum, /^sha256:[a-f0-9]{64}$/);

    const loadResponse = await client.request('tools/call', {
      name: 'load_save',
      arguments: {
        path: toRepoRelativePath(saveResponse.result.structuredContent.savePath)
      }
    });

    assert.equal(loadResponse.result.isError, false);
    assert.deepEqual(
      Object.keys(loadResponse.result.structuredContent).sort(),
      ['payloadPath', 'save', 'savePath', 'snapshot']
    );
    assert.deepEqual(loadResponse.result.structuredContent.save, saveResponse.result.structuredContent.save);
    assertStateSnapshotV1(loadResponse.result.structuredContent.snapshot);
    assert.equal(loadResponse.result.structuredContent.snapshot.scene, 'movement');
    assert.equal(loadResponse.result.structuredContent.snapshot.tick, 3);
    assert.equal(loadResponse.result.structuredContent.snapshot.entities[0].components.transform.fields.x, 6);
    assert.equal(loadResponse.result.structuredContent.snapshot.entities[0].components.transform.fields.y, 9);
  } finally {
    await client.close();
  }
});

test('load_save reports checksum mismatch predictably', async (t) => {
  const client = await initializeClient();
  const outDir = path.join(await createTempRepoDir(t), 'save');

  try {
    const saveResponse = await client.request('tools/call', {
      name: 'save_state_snapshot',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        outDir: toRepoRelativePath(outDir)
      }
    });

    assert.equal(saveResponse.result.isError, false);
    const payloadPath = saveResponse.result.structuredContent.payloadPath;
    const payload = JSON.parse(await readFile(payloadPath, 'utf8'));
    payload.tick = 4;
    await writeFile(payloadPath, `${canonicalJSONStringify(payload)}\n`, 'utf8');

    const loadResponse = await client.request('tools/call', {
      name: 'load_save',
      arguments: {
        path: toRepoRelativePath(saveResponse.result.structuredContent.savePath)
      }
    });

    assert.equal(loadResponse.result.isError, true);
    assert.match(loadResponse.result.content[0].text, /save payload checksum mismatch/);
    assert.match(loadResponse.result.structuredContent.errorMessage, /save payload checksum mismatch/);
  } finally {
    await client.close();
  }
});

test('save_state_snapshot rejects outDir outside the repository root predictably', async () => {
  const client = await initializeClient();

  try {
    const saveResponse = await client.request('tools/call', {
      name: 'save_state_snapshot',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        outDir: '../outside-save-root'
      }
    });

    assert.equal(saveResponse.result.isError, true);
    assert.match(saveResponse.result.content[0].text, /path must stay inside the repository root/);
    assert.equal(saveResponse.result.structuredContent.ok, false);
    assert.equal(saveResponse.result.structuredContent.errorName, 'ToolInputError');
    assert.match(saveResponse.result.structuredContent.errorMessage, /path must stay inside the repository root/);
  } finally {
    await client.close();
  }
});

test('load_save reports missing save path predictably', async () => {
  const client = await initializeClient();

  try {
    const loadResponse = await client.request('tools/call', {
      name: 'load_save',
      arguments: {
        path: './fixtures/savegame/does-not-exist.savegame.json'
      }
    });

    assert.equal(loadResponse.result.isError, true);
    assert.match(loadResponse.result.content[0].text, /ENOENT/);
    assert.equal(loadResponse.result.structuredContent.ok, false);
    assert.match(loadResponse.result.structuredContent.errorMessage, /ENOENT/);
  } finally {
    await client.close();
  }
});

test('load_save reports malformed payload predictably', async (t) => {
  const client = await initializeClient();
  const outDir = path.join(await createTempRepoDir(t), 'save');

  try {
    const saveResponse = await client.request('tools/call', {
      name: 'save_state_snapshot',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        outDir: toRepoRelativePath(outDir)
      }
    });

    assert.equal(saveResponse.result.isError, false);
    const payloadPath = saveResponse.result.structuredContent.payloadPath;
    await writeFile(payloadPath, '{"stateSnapshotVersion": 1,\n', 'utf8');

    const loadResponse = await client.request('tools/call', {
      name: 'load_save',
      arguments: {
        path: toRepoRelativePath(saveResponse.result.structuredContent.savePath)
      }
    });

    assert.equal(loadResponse.result.isError, true);
    assert.match(loadResponse.result.content[0].text, /failed to read state snapshot payload/);
    assert.equal(loadResponse.result.structuredContent.ok, false);
    assert.match(loadResponse.result.structuredContent.errorMessage, /failed to read state snapshot payload/);
  } finally {
    await client.close();
  }
});

test('load_save rejects payloadRef traversal predictably', async (t) => {
  const client = await initializeClient();
  const outDir = path.join(await createTempRepoDir(t), 'save');

  try {
    const saveResponse = await client.request('tools/call', {
      name: 'save_state_snapshot',
      arguments: {
        path: './scenes/state/movement.scene.json',
        ticks: 3,
        seed: 10,
        outDir: toRepoRelativePath(outDir)
      }
    });

    assert.equal(saveResponse.result.isError, false);
    const savePath = saveResponse.result.structuredContent.savePath;
    const envelope = JSON.parse(await readFile(savePath, 'utf8'));

    await writeFile(
      savePath,
      `${canonicalJSONStringify({
        ...envelope,
        payloadRef: '../outside.payload.json'
      })}\n`,
      'utf8'
    );

    const loadResponse = await client.request('tools/call', {
      name: 'load_save',
      arguments: {
        path: toRepoRelativePath(savePath)
      }
    });

    assert.equal(loadResponse.result.isError, true);
    assert.match(loadResponse.result.content[0].text, /unsafe payloadRef: \.\.\/outside\.payload\.json/);
    assert.match(loadResponse.result.structuredContent.errorMessage, /unsafe payloadRef: \.\.\/outside\.payload\.json/);
  } finally {
    await client.close();
  }
});
