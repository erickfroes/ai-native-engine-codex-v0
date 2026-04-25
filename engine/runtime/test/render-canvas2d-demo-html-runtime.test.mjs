import test from 'node:test';
import assert from 'node:assert/strict';

import { renderCanvas2DDemoHtmlV1 } from '../src/index.mjs';

test('renderCanvas2DDemoHtmlV1 returns deterministic HTML with canvas and rect draw commands', () => {
  const renderSnapshot = {
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

  const first = renderCanvas2DDemoHtmlV1({
    title: 'tutorial Canvas 2D Demo',
    renderSnapshot,
    metadata: {
      viewport: '320x180',
      scene: 'tutorial',
      tick: 4
    }
  });
  const second = renderCanvas2DDemoHtmlV1({
    title: 'tutorial Canvas 2D Demo',
    renderSnapshot,
    metadata: {
      viewport: '320x180',
      scene: 'tutorial',
      tick: 4
    }
  });

  assert.equal(first, second);
  assert.equal(
    first,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>tutorial Canvas 2D Demo</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 24px; font-family: "Courier New", monospace; background: #f4efe6; color: #201a13; }
    main { display: grid; gap: 16px; max-width: 960px; margin: 0 auto; }
    .frame { background: #fffdf8; border: 1px solid #d7cfc2; padding: 16px; overflow: auto; }
    canvas { display: block; background: #fffdf8; border: 1px solid #d7cfc2; }
    .meta { display: grid; gap: 8px; margin: 0; }
    .meta div { display: grid; gap: 2px; }
    .meta dt { font-weight: 700; }
    .meta dd { margin: 0; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>tutorial Canvas 2D Demo</h1>
    </header>
    <section class="frame">
      <canvas id="render-canvas-demo" data-canvas-demo-version="1" data-scene="tutorial" data-tick="4" width="320" height="180"></canvas>
      <script>
        const renderSnapshot = {"renderSnapshotVersion":1,"scene":"tutorial","tick":4,"viewport":{"width":320,"height":180},"drawCalls":[{"kind":"rect","id":"camera.main","x":0,"y":4,"width":16,"height":16,"layer":0},{"kind":"rect","id":"player.hero","x":0,"y":0,"width":16,"height":16,"layer":0}]};
        const canvas = document.getElementById("render-canvas-demo");
        const context = canvas.getContext("2d");
        if (context) {
          context.clearRect(0, 0, renderSnapshot.viewport.width, renderSnapshot.viewport.height);
          context.fillStyle = "#201a13";
          context.strokeStyle = "#201a13";
          context.lineWidth = 1;
          for (const drawCall of renderSnapshot.drawCalls) {
            context.fillRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);
            context.strokeRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);
          }
        }
      </script>
    </section>
    <dl class="meta">
      <div>
        <dt>scene</dt>
        <dd>tutorial</dd>
      </div>
      <div>
        <dt>tick</dt>
        <dd>4</dd>
      </div>
      <div>
        <dt>viewport</dt>
        <dd>320x180</dd>
      </div>
    </dl>
  </main>
</body>
</html>
`
  );
  assert.match(first, /<canvas id="render-canvas-demo"/);
  assert.match(first, /context\.fillRect\(drawCall\.x, drawCall\.y, drawCall\.width, drawCall\.height\);/);
  assert.match(first, /context\.strokeRect\(drawCall\.x, drawCall\.y, drawCall\.width, drawCall\.height\);/);
});

test('renderCanvas2DDemoHtmlV1 renders deterministic empty HTML when drawCalls is empty', () => {
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

  const first = renderCanvas2DDemoHtmlV1({
    title: 'empty-scene Canvas 2D Demo',
    renderSnapshot,
    metadata: {
      scene: 'empty-scene',
      tick: 0,
      viewport: '32x24'
    }
  });
  const second = renderCanvas2DDemoHtmlV1({
    title: 'empty-scene Canvas 2D Demo',
    renderSnapshot,
    metadata: {
      scene: 'empty-scene',
      tick: 0,
      viewport: '32x24'
    }
  });

  assert.equal(first, second);
  assert.match(
    first,
    /<canvas id="render-canvas-demo" data-canvas-demo-version="1" data-scene="empty-scene" data-tick="0" width="32" height="24"><\/canvas>/
  );
  assert.ok(first.includes('"drawCalls":[]'));
});

test('renderCanvas2DDemoHtmlV1 preserves the snapshot order for multiple rect draw calls', () => {
  const html = renderCanvas2DDemoHtmlV1({
    title: 'multi-rect Canvas 2D Demo',
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
      scene: 'multi-rect',
      tick: 2,
      viewport: '64x48'
    }
  });

  assert.ok(html.indexOf('"id":"background"') < html.indexOf('"id":"mid"'));
  assert.ok(html.indexOf('"id":"mid"') < html.indexOf('"id":"front"'));
  assert.match(html, /<canvas id="render-canvas-demo" data-canvas-demo-version="1" data-scene="multi-rect" data-tick="2" width="64" height="48"><\/canvas>/);
});

test('renderCanvas2DDemoHtmlV1 escapes title and scene for HTML and serializes snapshot safely for inline script', () => {
  const html = renderCanvas2DDemoHtmlV1({
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
      scene: 'arena </script><script>alert("x")</script> & "alpha"'
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
  assert.doesNotMatch(html, /Date\.now|new Date|performance\.now|toISOString/);
});
