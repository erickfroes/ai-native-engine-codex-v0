import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const serverPath = path.join(repoRoot, 'tools', 'mcp-server', 'src', 'index.mjs');
const atlasSceneMcpPath = './engine/runtime/test/fixtures/atlas-material/atlas-sprite-consumption.scene.json';
const atlasManifestMcpPath = './engine/runtime/test/fixtures/atlas-material/starter.atlas-material.json';
const visualSpriteAssetManifestMcpPath = './fixtures/assets/valid.asset-manifest.json';

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
    return new Promise((resolve) => pending.set(id, { resolve }));
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

async function initialize(client) {
  const initResponse = await client.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'node-test', version: '1.0.0' }
  });

  assert.equal(initResponse.result.protocolVersion, '2025-06-18');
  client.notify('notifications/initialized');
}

async function createRepoTempDir(t) {
  const directory = await mkdtemp(path.join(repoRoot, '.tmp-atlas-region-mcp-'));
  t.after(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('mcp exposes atlas region consumption only on Browser Demo and Portable Export tools', async () => {
  const client = createClient();

  try {
    await initialize(client);

    const toolsResponse = await client.request('tools/list');
    const renderBrowserDemo = toolsResponse.result.tools.find((entry) => entry.name === 'render_browser_demo');
    const exportPortable = toolsResponse.result.tools.find((entry) => entry.name === 'export_portable_html_game');
    const exportHtml = toolsResponse.result.tools.find((entry) => entry.name === 'export_html_game');

    assert.ok(renderBrowserDemo);
    assert.ok(exportPortable);
    assert.ok(exportHtml);
    assert.ok(Object.prototype.hasOwnProperty.call(renderBrowserDemo.inputSchema.properties, 'atlasMaterialManifestPath'));
    assert.ok(Object.prototype.hasOwnProperty.call(exportPortable.inputSchema.properties, 'atlasMaterialManifestPath'));
    assert.equal(Object.prototype.hasOwnProperty.call(exportHtml.inputSchema.properties, 'atlasMaterialManifestPath'), false);
  } finally {
    await client.close();
  }
});

test('mcp render_browser_demo consumes atlas sprite crop metadata when atlasMaterialManifestPath is provided', async () => {
  const client = createClient();

  try {
    await initialize(client);

    const fallback = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: atlasSceneMcpPath
      }
    });
    const atlas = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: atlasSceneMcpPath,
        atlasMaterialManifestPath: atlasManifestMcpPath
      }
    });

    assert.equal(fallback.result.isError, false);
    assert.equal(atlas.result.isError, false);
    assert.doesNotMatch(fallback.result.structuredContent.html, /"atlasMaterial":/);
    assert.match(atlas.result.structuredContent.html, /"atlasMaterial":/);
    assert.match(atlas.result.structuredContent.html, /"atlasRegionBindingContractVersion":1/);
    assert.match(atlas.result.structuredContent.html, /"bindingSource":"atlasBindingId"/);
    assert.match(atlas.result.structuredContent.html, /"assetId":"atlas\.world"/);
    assert.match(atlas.result.structuredContent.html, /drawAtlasSpriteImage/);
  } finally {
    await client.close();
  }
});

test('mcp export_portable_html_game writes atlas-backed embedded asset HTML', async (t) => {
  const client = createClient();
  const tempDir = await createRepoTempDir(t);
  const outputPath = path.relative(repoRoot, path.join(tempDir, 'atlas.html')).replaceAll('\\', '/');

  try {
    await initialize(client);

    const response = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: atlasSceneMcpPath,
        outputPath,
        atlasMaterialManifestPath: atlasManifestMcpPath
      }
    });

    assert.equal(response.result.isError, false);
    assert.equal(response.result.structuredContent.scene, 'atlas-sprite-consumption');
    assert.equal(response.result.structuredContent.options.assetManifest, true);
    assert.equal(response.result.structuredContent.embeddedAssetCount, 1);

    const html = await readFile(path.join(repoRoot, outputPath), 'utf8');
    assert.match(html, /"atlasMaterial":/);
    assert.match(html, /"atlasRegionBindingContractVersion":1/);
    assert.match(html, /"bindingSource":"atlasBindingId"/);
    assert.match(html, /data:image\/png;base64,/);
    assert.doesNotMatch(html, /file:\/\/\//);
  } finally {
    await client.close();
  }
});

test('mcp rejects atlas region consumption combined with sprite animation', async () => {
  const client = createClient();

  try {
    await initialize(client);

    const response = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: atlasSceneMcpPath,
        atlasMaterialManifestPath: atlasManifestMcpPath,
        spriteAnimation: true
      }
    });

    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /spriteAnimation.*cannot be combined.*atlasMaterialManifestPath/);
  } finally {
    await client.close();
  }
});

test('mcp rejects missing explicit atlasBindingId refs predictably', async (t) => {
  const client = createClient();
  const tempDir = await createRepoTempDir(t);
  const scenePath = path.join(repoRoot, atlasSceneMcpPath);
  const scene = JSON.parse(await readFile(scenePath, 'utf8'));
  const invalidScenePath = path.join(tempDir, 'invalid-atlas-binding.scene.json');
  scene.entities = scene.entities.map((entity) =>
    entity.id === 'player.hero'
      ? {
          ...entity,
          components: entity.components.map((component) =>
            component.kind === 'visual.sprite'
              ? {
                  ...component,
                  fields: {
                    ...component.fields,
                    atlasBindingId: 'missing.hero'
                  }
                }
              : component
          )
        }
      : entity
  );
  await writeFile(invalidScenePath, JSON.stringify(scene, null, 2));
  const invalidSceneMcpPath = `./${path.relative(repoRoot, invalidScenePath).replaceAll('\\', '/')}`;

  try {
    await initialize(client);

    const response = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: invalidSceneMcpPath,
        atlasMaterialManifestPath: atlasManifestMcpPath
      }
    });

    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /atlasBindingId references unknown sprite binding `missing\.hero`/);

    const outputPath = path.relative(repoRoot, path.join(tempDir, 'invalid-atlas-binding.html')).replaceAll('\\', '/');
    const portable = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: invalidSceneMcpPath,
        outputPath,
        atlasMaterialManifestPath: atlasManifestMcpPath
      }
    });

    assert.equal(portable.result.isError, true);
    assert.match(portable.result.content[0].text, /atlasBindingId references unknown sprite binding `missing\.hero`/);
  } finally {
    await client.close();
  }
});

test('mcp rejects asset manifests combined with atlas material manifests predictably', async (t) => {
  const client = createClient();
  const tempDir = await createRepoTempDir(t);
  const outputPath = path.relative(repoRoot, path.join(tempDir, 'conflict.html')).replaceAll('\\', '/');

  try {
    await initialize(client);

    const browserDemo = await client.request('tools/call', {
      name: 'render_browser_demo',
      arguments: {
        path: atlasSceneMcpPath,
        assetManifestPath: visualSpriteAssetManifestMcpPath,
        atlasMaterialManifestPath: atlasManifestMcpPath
      }
    });
    const portable = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: atlasSceneMcpPath,
        outputPath,
        assetManifestPath: visualSpriteAssetManifestMcpPath,
        atlasMaterialManifestPath: atlasManifestMcpPath
      }
    });

    assert.equal(browserDemo.result.isError, true);
    assert.match(browserDemo.result.content[0].text, /provide only one of `assetManifestPath` or `atlasMaterialManifestPath`/);
    assert.equal(portable.result.isError, true);
    assert.match(portable.result.content[0].text, /provide only one of `assetManifestPath` or `atlasMaterialManifestPath`/);
  } finally {
    await client.close();
  }
});

test('mcp rejects portable atlas region export combined with sprite animation', async (t) => {
  const client = createClient();
  const tempDir = await createRepoTempDir(t);
  const outputPath = path.relative(repoRoot, path.join(tempDir, 'invalid-atlas-animation.html')).replaceAll('\\', '/');

  try {
    await initialize(client);

    const response = await client.request('tools/call', {
      name: 'export_portable_html_game',
      arguments: {
        scenePath: atlasSceneMcpPath,
        outputPath,
        atlasMaterialManifestPath: atlasManifestMcpPath,
        spriteAnimation: true
      }
    });

    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /spriteAnimation.*cannot be combined.*atlasMaterialManifestPath/);
  } finally {
    await client.close();
  }
});
