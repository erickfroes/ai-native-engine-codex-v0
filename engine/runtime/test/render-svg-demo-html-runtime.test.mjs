import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSvgDemoHtmlV1 } from '../src/index.mjs';

const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="1" data-scene="tutorial" data-tick="4" width="320" height="180" viewBox="0 0 320 180">
  <rect id="player.hero" data-layer="0" x="0" y="0" width="16" height="16" />
</svg>
`;

test('renderSvgDemoHtmlV1 returns deterministic HTML with embedded SVG and sorted metadata', () => {
  const first = renderSvgDemoHtmlV1({
    title: 'Tutorial SVG Demo',
    svg: sampleSvg,
    metadata: {
      tick: 4,
      scene: 'tutorial',
      svgVersion: 1
    }
  });
  const second = renderSvgDemoHtmlV1({
    title: 'Tutorial SVG Demo',
    svg: sampleSvg,
    metadata: {
      tick: 4,
      scene: 'tutorial',
      svgVersion: 1
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
  <title>Tutorial SVG Demo</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; padding: 24px; font-family: "Courier New", monospace; background: #f4efe6; color: #201a13; }
    main { display: grid; gap: 16px; max-width: 960px; margin: 0 auto; }
    .frame { background: #fffdf8; border: 1px solid #d7cfc2; padding: 16px; overflow: auto; }
    .meta { display: grid; gap: 8px; margin: 0; }
    .meta div { display: grid; gap: 2px; }
    .meta dt { font-weight: 700; }
    .meta dd { margin: 0; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Tutorial SVG Demo</h1>
    </header>
    <section class="frame">
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="1" data-scene="tutorial" data-tick="4" width="320" height="180" viewBox="0 0 320 180">
  <rect id="player.hero" data-layer="0" x="0" y="0" width="16" height="16" />
</svg>
    </section>
    <dl class="meta">
      <div>
        <dt>scene</dt>
        <dd>tutorial</dd>
      </div>
      <div>
        <dt>svgVersion</dt>
        <dd>1</dd>
      </div>
      <div>
        <dt>tick</dt>
        <dd>4</dd>
      </div>
    </dl>
  </main>
</body>
</html>
`
  );
});

test('renderSvgDemoHtmlV1 escapes title and metadata values but preserves raw SVG markup', () => {
  const html = renderSvgDemoHtmlV1({
    title: `Demo & "quoted" <tag> 'apostrophe'`,
    svg: '<svg data-demo="ok"></svg>\n',
    metadata: {
      label: `Value & "quoted" <tag> 'apostrophe'`
    }
  });

  assert.match(html, /<title>Demo &amp; &quot;quoted&quot; &lt;tag&gt; &#39;apostrophe&#39;<\/title>/);
  assert.match(html, /<h1>Demo &amp; &quot;quoted&quot; &lt;tag&gt; &#39;apostrophe&#39;<\/h1>/);
  assert.match(html, /<dd>Value &amp; &quot;quoted&quot; &lt;tag&gt; &#39;apostrophe&#39;<\/dd>/);
  assert.match(html, /<svg data-demo="ok"><\/svg>/);
});
