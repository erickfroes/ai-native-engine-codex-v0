import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import {
  renderBrowserPlayableDemoHtmlV1,
  createBrowserPlayableDemoMetadataV1,
  BROWSER_PLAYABLE_DEMO_VERSION,
  DEFAULT_BROWSER_PLAYABLE_STEP_PX
} from '../src/index.mjs';

function extractInlineJson(html) {
  const match = html.match(/<script id="browser-playable-demo-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'expected inline json block');
  return match[1];
}

function extractInlineScript(html) {
  const match = html.match(/<script>\n([\s\S]*?)\n  <\/script>\n<\/body>/);
  assert.ok(match, 'expected inline script block');
  return match[1];
}

function createCanvasHarness(html) {
  const script = extractInlineScript(html);
  const operations = [];
  const canvasListeners = new Map();
  const resetButtonListeners = new Map();
  const animationFrames = [];
  const cancelledAnimationFrames = new Set();
  let nextAnimationFrameHandle = 1;
  const statusElement = { textContent: '' };
  const dataElement = { textContent: extractInlineJson(html) };
  const resetButton = {
    addEventListener(eventName, handler) {
      resetButtonListeners.set(eventName, handler);
    },
    click() {
      const handler = resetButtonListeners.get('click');
      if (handler) {
        handler({ preventDefault() {} });
      }
    }
  };
  const context2d = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 0,
    clearRect(...args) {
      operations.push({ method: 'clearRect', args });
    },
    fillRect(...args) {
      operations.push({ method: 'fillRect', fillStyle: this.fillStyle, args });
    },
    strokeRect(...args) {
      operations.push({ method: 'strokeRect', strokeStyle: this.strokeStyle, args });
    }
  };
  const canvas = {
    width: 320,
    height: 180,
    focusedCount: 0,
    getContext(kind) {
      assert.equal(kind, '2d');
      return context2d;
    },
    addEventListener(eventName, handler) {
      canvasListeners.set(eventName, handler);
    },
    focus() {
      this.focusedCount += 1;
    }
  };

  vm.runInNewContext(script, {
    JSON,
    requestAnimationFrame(callback) {
      const handle = nextAnimationFrameHandle;
      nextAnimationFrameHandle += 1;
      animationFrames.push({ handle, callback });
      return handle;
    },
    cancelAnimationFrame(handle) {
      cancelledAnimationFrames.add(handle);
    },
    document: {
      getElementById(id) {
        if (id === 'browser-playable-demo-data') {
          return dataElement;
        }
        if (id === 'browser-playable-demo-canvas') {
          return canvas;
        }
        if (id === 'browser-playable-demo-reset') {
          return resetButton;
        }
        if (id === 'browser-playable-demo-status') {
          return statusElement;
        }
        throw new Error(`unexpected element lookup: ${id}`);
      }
    }
  });

  return {
    animationFrames,
    canvas,
    canvasListeners,
    flushAnimationFrames(count) {
      for (let index = 0; index < count; index += 1) {
        const frame = animationFrames.shift();
        assert.ok(frame, 'expected a scheduled animation frame');
        if (!cancelledAnimationFrames.has(frame.handle)) {
          frame.callback();
        }
      }
    },
    operations,
    resetButton,
    statusElement
  };
}

function createTutorialSnapshot() {
  return {
    renderSnapshotVersion: 1,
    scene: 'tutorial',
    tick: 4,
    viewport: {
      width: 320,
      height: 180
    },
    drawCalls: [
      { kind: 'rect', id: 'camera.main', x: 0, y: 4, width: 16, height: 16, layer: 0 },
      { kind: 'rect', id: 'player.hero', x: 0, y: 0, width: 16, height: 16, layer: 0 }
    ]
  };
}

test('renderBrowserPlayableDemoHtmlV1 returns deterministic HTML with canvas and keyboard capture', () => {
  const htmlA = renderBrowserPlayableDemoHtmlV1({
    title: 'tutorial Browser Playable Demo',
    renderSnapshot: createTutorialSnapshot(),
    metadata: {
      controllableEntityId: 'player.hero',
      stepPx: DEFAULT_BROWSER_PLAYABLE_STEP_PX
    }
  });
  const htmlB = renderBrowserPlayableDemoHtmlV1({
    title: 'tutorial Browser Playable Demo',
    renderSnapshot: createTutorialSnapshot(),
    metadata: {
      controllableEntityId: 'player.hero',
      stepPx: DEFAULT_BROWSER_PLAYABLE_STEP_PX
    }
  });

  assert.equal(htmlA, htmlB);
  assert.match(htmlA, /^<!DOCTYPE html>/);
  assert.match(htmlA, /<canvas id="browser-playable-demo-canvas"/);
  assert.match(htmlA, /tabindex="0"/);
  assert.match(htmlA, /addEventListener\("keydown"/);
  assert.match(htmlA, /requestAnimationFrame\(renderFrame\)/);
  assert.match(htmlA, /id="browser-playable-demo-reset"/);
  assert.match(htmlA, /ArrowRight/);
  assert.match(htmlA, /KeyD/);
  assert.match(htmlA, /ArrowLeft/);
  assert.match(htmlA, /KeyA/);
  assert.match(htmlA, /ArrowUp/);
  assert.match(htmlA, /KeyW/);
  assert.match(htmlA, /ArrowDown/);
  assert.match(htmlA, /KeyS/);
  assert.match(htmlA, /4 px per keydown/);
  assert.doesNotMatch(htmlA, /<script[^>]+src=/);
  assert.doesNotMatch(htmlA, /https?:\/\/|fetch\(|XMLHttpRequest|WebSocket|Date\.now|new Date|performance\.now|toISOString|localStorage/);
  assert.equal(BROWSER_PLAYABLE_DEMO_VERSION, 1);
});

test('renderBrowserPlayableDemoHtmlV1 renders deterministic empty HTML when drawCalls is empty', () => {
  const renderSnapshot = {
    renderSnapshotVersion: 1,
    scene: 'empty-scene',
    tick: 0,
    viewport: {
      width: 32,
      height: 24
    },
    drawCalls: []
  };

  const first = renderBrowserPlayableDemoHtmlV1({
    title: 'empty-scene Browser Playable Demo',
    renderSnapshot
  });
  const second = renderBrowserPlayableDemoHtmlV1({
    title: 'empty-scene Browser Playable Demo',
    renderSnapshot
  });

  assert.equal(first, second);
  assert.match(
    first,
    /<canvas id="browser-playable-demo-canvas" data-browser-demo-version="1" data-scene="empty-scene" data-tick="0" data-controllable-entity="" width="32" height="24" tabindex="0"/
  );
  assert.ok(first.includes('"drawCalls":[]'));
  assert.match(first, /No controllable rect\. Step 4 px\./);
});

test('renderBrowserPlayableDemoHtmlV1 escapes HTML and JSON payload safely', () => {
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'Arena <Demo> & "alpha"',
    renderSnapshot: {
      renderSnapshotVersion: 1,
      scene: 'arena </script><script>alert("x")</script> & "alpha"',
      tick: 2,
      viewport: {
        width: 64,
        height: 48
      },
      drawCalls: [
        {
          kind: 'rect',
          id: 'player </script><script>alert("id")</script> & "ally"',
          x: 1,
          y: 2,
          width: 3,
          height: 4,
          layer: 0
        }
      ]
    },
    metadata: {
      controllableEntityId: 'player </script><script>alert("id")</script> & "ally"'
    }
  });

  assert.match(html, /<title>Arena &lt;Demo&gt; &amp; &quot;alpha&quot;<\/title>/);
  assert.match(html, /<h1>Arena &lt;Demo&gt; &amp; &quot;alpha&quot;<\/h1>/);
  assert.match(
    html,
    /data-scene="arena &lt;\/script&gt;&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; &quot;alpha&quot;"/
  );
  assert.ok(
    html.includes(
      '"scene":"arena \\u003C/script\\u003E\\u003Cscript\\u003Ealert(\\"x\\")\\u003C/script\\u003E \\u0026 \\"alpha\\""'
    )
  );
  assert.ok(
    html.includes(
      '"id":"player \\u003C/script\\u003E\\u003Cscript\\u003Ealert(\\"id\\")\\u003C/script\\u003E \\u0026 \\"ally\\""'
    )
  );
  assert.doesNotMatch(html, /<\/script><script>/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|https?:\/\//);
  assert.doesNotMatch(html, /Date\.now|new Date|performance\.now|fetch\(|XMLHttpRequest|WebSocket|toISOString|localStorage/);
});

test('renderBrowserPlayableDemoHtmlV1 preserves snapshot order for multiple rect draw calls', () => {
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'multi-rect Browser Playable Demo',
    renderSnapshot: {
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
    },
    metadata: {
      controllableEntityId: 'mid'
    }
  });

  assert.ok(html.indexOf('"id":"background"') < html.indexOf('"id":"mid"'));
  assert.ok(html.indexOf('"id":"mid"') < html.indexOf('"id":"front"'));
  assert.match(
    html,
    /<canvas id="browser-playable-demo-canvas" data-browser-demo-version="1" data-scene="multi-rect" data-tick="2" data-controllable-entity="mid" width="64" height="48" tabindex="0"/
  );
});

test('renderBrowserPlayableDemoHtmlV1 falls back to the first rect when player.hero is absent', () => {
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'fallback Browser Playable Demo',
    renderSnapshot: {
      renderSnapshotVersion: 1,
      scene: 'fallback-scene',
      tick: 1,
      viewport: {
        width: 64,
        height: 48
      },
      drawCalls: [
        { kind: 'rect', id: 'camera.main', x: 0, y: 4, width: 16, height: 16, layer: 0 },
        { kind: 'rect', id: 'npc.guide', x: 10, y: 12, width: 8, height: 8, layer: 1 }
      ]
    },
    metadata: {
      controllableEntityId: 'player.hero'
    }
  });
  const harness = createCanvasHarness(html);
  const keydown = harness.canvasListeners.get('keydown');

  assert.equal(typeof keydown, 'function');
  assert.match(html, /data-controllable-entity="camera\.main"/);

  keydown({
    code: 'ArrowDown',
    preventDefault() {}
  });

  assert.match(harness.statusElement.textContent, /Controlled rect camera\.main at \(0, 8\)/);
});

test('renderBrowserPlayableDemoHtmlV1 moves the nominated controllable rect by the fixed step', () => {
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'tutorial Browser Playable Demo',
    renderSnapshot: createTutorialSnapshot(),
    metadata: {
      controllableEntityId: 'player.hero'
    }
  });
  const harness = createCanvasHarness(html);
  const keydown = harness.canvasListeners.get('keydown');

  assert.equal(typeof keydown, 'function');
  assert.equal(harness.canvas.focusedCount > 0, true);

  let prevented = false;
  keydown({
    code: 'ArrowRight',
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  const highlightedRects = harness.operations.filter(
    (entry) => entry.method === 'fillRect' && entry.fillStyle === '#b74f2a'
  );
  assert.deepEqual(highlightedRects[0].args, [0, 0, 16, 16]);
  assert.deepEqual(highlightedRects[1].args, [4, 0, 16, 16]);
  assert.match(harness.statusElement.textContent, /Controlled rect player\.hero at \(4, 0\)/);
});

test('renderBrowserPlayableDemoHtmlV1 keeps redrawing through requestAnimationFrame without moving state on its own', () => {
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'tutorial Browser Playable Demo',
    renderSnapshot: createTutorialSnapshot(),
    metadata: {
      controllableEntityId: 'player.hero'
    }
  });
  const harness = createCanvasHarness(html);
  const initialOperationCount = harness.operations.length;

  assert.equal(harness.animationFrames.length, 1);

  harness.flushAnimationFrames(3);

  assert.equal(harness.animationFrames.length, 1);
  assert.ok(harness.operations.length > initialOperationCount);
  assert.match(harness.statusElement.textContent, /Inputs 0/);
  assert.match(harness.statusElement.textContent, /Controlled rect player\.hero at \(0, 0\)/);
});

test('renderBrowserPlayableDemoHtmlV1 reset button restores the initial rect position and HUD', () => {
  const html = renderBrowserPlayableDemoHtmlV1({
    title: 'tutorial Browser Playable Demo',
    renderSnapshot: createTutorialSnapshot(),
    metadata: {
      controllableEntityId: 'player.hero'
    }
  });
  const harness = createCanvasHarness(html);
  const keydown = harness.canvasListeners.get('keydown');

  keydown({
    code: 'ArrowRight',
    preventDefault() {}
  });

  harness.resetButton.click();

  assert.match(harness.statusElement.textContent, /Inputs 0/);
  assert.match(harness.statusElement.textContent, /Controlled rect player\.hero at \(0, 0\)/);
  const highlightedRects = harness.operations.filter(
    (entry) => entry.method === 'fillRect' && entry.fillStyle === '#b74f2a'
  );
  assert.deepEqual(highlightedRects.at(-1).args, [0, 0, 16, 16]);
});

test('createBrowserPlayableDemoMetadataV1 picks the first scene rect before falling back to snapshot order', () => {
  const metadata = createBrowserPlayableDemoMetadataV1(
    {
      entities: [
        { id: 'player.hero' },
        { id: 'camera.main' }
      ]
    },
    createTutorialSnapshot()
  );

  assert.deepEqual(metadata, {
    controllableEntityId: 'player.hero',
    stepPx: 4
  });
});
