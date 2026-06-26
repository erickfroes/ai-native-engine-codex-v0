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

test('mcp inspect_ui_system is listed and returns deterministic widget trees', async () => {
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
    const tool = toolsResponse.result.tools.find((entry) => entry.name === 'inspect_ui_system');
    assert.ok(tool);
    assert.deepEqual(tool.inputSchema.required, ['path']);

    const reportResponse = await client.request('tools/call', {
      name: 'inspect_ui_system',
      arguments: {
        path: './engine/runtime/test/fixtures/ui-screen-prefab.scene.json'
      }
    });

    assert.equal(reportResponse.result.isError, false);
    assert.deepEqual(reportResponse.result.structuredContent, {
      uiSystemReportVersion: 1,
      scene: 'ui-screen-prefab-fixture',
      screens: [
        {
          screenId: 'hud.main',
          entityId: 'ui.hud',
          active: true,
          layer: 100,
          widgets: [
            {
              widgetId: 'hud.root',
              kind: 'panel',
              text: null,
              x: 0,
              y: 0,
              width: 320,
              height: 48,
              parentWidgetId: null,
              depth: 0
            },
            {
              widgetId: 'score.label',
              kind: 'label',
              text: 'Score: 000',
              x: 8,
              y: 8,
              width: null,
              height: null,
              parentWidgetId: 'hud.root',
              depth: 1
            },
            {
              widgetId: 'lives.label',
              kind: 'label',
              text: 'Lives: 3',
              x: 240,
              y: 8,
              width: null,
              height: null,
              parentWidgetId: 'hud.root',
              depth: 1
            }
          ],
          widgetTree: [
            {
              widgetId: 'hud.root',
              kind: 'panel',
              text: null,
              x: 0,
              y: 0,
              width: 320,
              height: 48,
              children: [
                {
                  widgetId: 'score.label',
                  kind: 'label',
                  text: 'Score: 000',
                  x: 8,
                  y: 8,
                  width: null,
                  height: null,
                  children: []
                },
                {
                  widgetId: 'lives.label',
                  kind: 'label',
                  text: 'Lives: 3',
                  x: 240,
                  y: 8,
                  width: null,
                  height: null,
                  children: []
                }
              ]
            }
          ]
        }
      ],
      warnings: []
    });

    const productionReportResponse = await client.request('tools/call', {
      name: 'inspect_ui_system',
      arguments: {
        path: './scenes/ui-production-screens.scene.json'
      }
    });

    assert.equal(productionReportResponse.result.isError, false);
    const productionReport = productionReportResponse.result.structuredContent;
    assert.equal(productionReport.uiSystemReportVersion, 1);
    assert.equal(productionReport.scene, 'ui-production-screens');
    assert.deepEqual(productionReport.screens.map((screen) => screen.screenId), [
      'hud.main',
      'menu.main',
      'pause.overlay'
    ]);
    assert.deepEqual(productionReport.screens.map((screen) => screen.active), [true, true, false]);
    assert.deepEqual(productionReport.screens.map((screen) => screen.widgets.length), [3, 4, 3]);
  } finally {
    await client.close();
  }
});
