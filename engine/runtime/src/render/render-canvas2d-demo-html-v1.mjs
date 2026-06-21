export const CANVAS_2D_DEMO_VERSION = 1;

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`renderCanvas2DDemoHtmlV1: \`${name}\` must be an object`);
  }
}

function assertInteger(name, value, minimum = undefined) {
  if (!Number.isInteger(value) || (minimum !== undefined && value < minimum)) {
    const suffix = minimum === undefined ? 'an integer' : `an integer >= ${minimum}`;
    throw new Error(`renderCanvas2DDemoHtmlV1: \`${name}\` must be ${suffix}`);
  }
}

function assertNonEmptyString(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`renderCanvas2DDemoHtmlV1: \`${name}\` must be a non-empty string`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function serializeInlineJson(value) {
  return JSON.stringify(value)
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003C')
    .replaceAll('>', '\\u003E')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function normalizeMetadataEntries(metadata) {
  if (metadata === undefined) {
    return [];
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('renderCanvas2DDemoHtmlV1: `metadata` must be an object when provided');
  }

  return Object.entries(metadata)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => [escapeHtml(key), escapeHtml(value)]);
}

function renderMetadataBlock(entries) {
  if (entries.length === 0) {
    return '';
  }

  const lines = [
    '    <dl class="meta">'
  ];

  for (const [key, value] of entries) {
    lines.push('      <div>');
    lines.push(`        <dt>${key}</dt>`);
    lines.push(`        <dd>${value}</dd>`);
    lines.push('      </div>');
  }

  lines.push('    </dl>');
  return `${lines.join('\n')}\n`;
}

function normalizeRectDrawCall(drawCall, index) {
  assertObject(drawCall, `renderSnapshot.drawCalls[${index}]`);
  if (drawCall.kind !== 'rect') {
    throw new Error(`renderCanvas2DDemoHtmlV1: drawCalls[${index}].kind must be \`rect\` or \`sprite\``);
  }

  assertNonEmptyString(`renderSnapshot.drawCalls[${index}].id`, drawCall.id);
  assertInteger(`renderSnapshot.drawCalls[${index}].x`, drawCall.x);
  assertInteger(`renderSnapshot.drawCalls[${index}].y`, drawCall.y);
  assertInteger(`renderSnapshot.drawCalls[${index}].width`, drawCall.width, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].height`, drawCall.height, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].layer`, drawCall.layer);

  return {
    kind: 'rect',
    id: drawCall.id,
    x: drawCall.x,
    y: drawCall.y,
    width: drawCall.width,
    height: drawCall.height,
    layer: drawCall.layer
  };
}

function normalizeSpriteDrawCall(drawCall, index) {
  assertObject(drawCall, `renderSnapshot.drawCalls[${index}]`);
  if (drawCall.kind !== 'sprite') {
    throw new Error(`renderCanvas2DDemoHtmlV1: drawCalls[${index}].kind must be \`rect\` or \`sprite\``);
  }

  assertNonEmptyString(`renderSnapshot.drawCalls[${index}].id`, drawCall.id);
  assertNonEmptyString(`renderSnapshot.drawCalls[${index}].assetId`, drawCall.assetId);
  if (drawCall.assetSrc !== undefined) {
    assertNonEmptyString(`renderSnapshot.drawCalls[${index}].assetSrc`, drawCall.assetSrc);
  }
  assertInteger(`renderSnapshot.drawCalls[${index}].x`, drawCall.x);
  assertInteger(`renderSnapshot.drawCalls[${index}].y`, drawCall.y);
  assertInteger(`renderSnapshot.drawCalls[${index}].width`, drawCall.width, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].height`, drawCall.height, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].layer`, drawCall.layer);

  return {
    kind: 'sprite',
    id: drawCall.id,
    assetId: drawCall.assetId,
    ...(drawCall.assetSrc !== undefined ? { assetSrc: drawCall.assetSrc } : {}),
    x: drawCall.x,
    y: drawCall.y,
    width: drawCall.width,
    height: drawCall.height,
    layer: drawCall.layer
  };
}

function normalizeDrawCall(drawCall, index) {
  if (drawCall?.kind === 'sprite') {
    return normalizeSpriteDrawCall(drawCall, index);
  }

  return normalizeRectDrawCall(drawCall, index);
}

function normalizeRenderSnapshot(renderSnapshot) {
  assertObject(renderSnapshot, 'renderSnapshot');
  assertInteger('renderSnapshot.renderSnapshotVersion', renderSnapshot.renderSnapshotVersion, 1);
  if (renderSnapshot.renderSnapshotVersion !== 1) {
    throw new Error('renderCanvas2DDemoHtmlV1: `renderSnapshot.renderSnapshotVersion` must be exactly 1');
  }

  assertNonEmptyString('renderSnapshot.scene', renderSnapshot.scene);
  assertInteger('renderSnapshot.tick', renderSnapshot.tick, 0);
  assertObject(renderSnapshot.viewport, 'renderSnapshot.viewport');
  assertInteger('renderSnapshot.viewport.width', renderSnapshot.viewport.width, 1);
  assertInteger('renderSnapshot.viewport.height', renderSnapshot.viewport.height, 1);

  if (!Array.isArray(renderSnapshot.drawCalls)) {
    throw new Error('renderCanvas2DDemoHtmlV1: `renderSnapshot.drawCalls` must be an array');
  }

  return {
    renderSnapshotVersion: 1,
    scene: renderSnapshot.scene,
    tick: renderSnapshot.tick,
    viewport: {
      width: renderSnapshot.viewport.width,
      height: renderSnapshot.viewport.height
    },
    drawCalls: renderSnapshot.drawCalls.map(normalizeDrawCall)
  };
}

function buildRectOnlyScriptLines(serializedSnapshot) {
  return [
    '      <script>',
    `        const renderSnapshot = ${serializedSnapshot};`,
    '        const canvas = document.getElementById("render-canvas-demo");',
    '        const context = canvas.getContext("2d");',
    '        if (context) {',
    '          context.clearRect(0, 0, renderSnapshot.viewport.width, renderSnapshot.viewport.height);',
    '          context.fillStyle = "#201a13";',
    '          context.strokeStyle = "#201a13";',
    '          context.lineWidth = 1;',
    '          for (const drawCall of renderSnapshot.drawCalls) {',
    '            context.fillRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '            context.strokeRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '          }',
    '        }',
    '      </script>'
  ];
}

function buildSpriteAwareScriptLines(serializedSnapshot) {
  return [
    '      <script>',
    `        const renderSnapshot = ${serializedSnapshot};`,
    '        const canvas = document.getElementById("render-canvas-demo");',
    '        const context = canvas.getContext("2d");',
    '        if (context) {',
    '          const spriteImageStateById = new Map();',
    '          function drawRectFallback(drawCall) {',
    '            context.fillRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '            context.strokeRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '          }',
    '          function redraw() {',
    '            context.clearRect(0, 0, renderSnapshot.viewport.width, renderSnapshot.viewport.height);',
    '            context.fillStyle = "#201a13";',
    '            context.strokeStyle = "#201a13";',
    '            context.lineWidth = 1;',
    '            for (const drawCall of renderSnapshot.drawCalls) {',
    '              if (drawCall.kind === "sprite") {',
    '                const imageState = spriteImageStateById.get(drawCall.id);',
    '                if (imageState?.loaded && imageState.image) {',
    '                  context.drawImage(imageState.image, drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '                  continue;',
    '                }',
    '              }',
    '              drawRectFallback(drawCall);',
    '            }',
    '          }',
    '          function makeSpriteImageState(drawCall) {',
    '            if (typeof Image !== "function" || typeof drawCall.assetSrc !== "string") {',
    '              return { image: null, loaded: false };',
    '            }',
    '            const image = new Image();',
    '            const state = { image, loaded: false };',
    '            image.onload = () => {',
    '              state.loaded = true;',
    '              redraw();',
    '            };',
    '            image.onerror = () => {',
    '              state.loaded = false;',
    '              redraw();',
    '            };',
    '            image.src = drawCall.assetSrc;',
    '            return state;',
    '          }',
    '          for (const drawCall of renderSnapshot.drawCalls) {',
    '            if (drawCall.kind === "sprite") {',
    '              spriteImageStateById.set(drawCall.id, makeSpriteImageState(drawCall));',
    '            }',
    '          }',
    '          redraw();',
    '        }',
    '      </script>'
  ];
}

export function renderCanvas2DDemoHtmlV1({ title, renderSnapshot, metadata } = {}) {
  assertNonEmptyString('title', title);

  const normalizedSnapshot = normalizeRenderSnapshot(renderSnapshot);
  const serializedSnapshot = serializeInlineJson(normalizedSnapshot);
  const metadataEntries = normalizeMetadataEntries(metadata);
  const metadataBlock = renderMetadataBlock(metadataEntries);
  const hasSpriteDrawCalls = normalizedSnapshot.drawCalls.some((drawCall) => drawCall.kind === 'sprite');
  const scriptLines = hasSpriteDrawCalls
    ? buildSpriteAwareScriptLines(serializedSnapshot)
    : buildRectOnlyScriptLines(serializedSnapshot);

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>',
    '    :root { color-scheme: light; }',
    '    body { margin: 0; padding: 24px; font-family: "Courier New", monospace; background: #f4efe6; color: #201a13; }',
    '    main { display: grid; gap: 16px; max-width: 960px; margin: 0 auto; }',
    '    .frame { background: #fffdf8; border: 1px solid #d7cfc2; padding: 16px; overflow: auto; }',
    '    canvas { display: block; background: #fffdf8; border: 1px solid #d7cfc2; }',
    '    .meta { display: grid; gap: 8px; margin: 0; }',
    '    .meta div { display: grid; gap: 2px; }',
    '    .meta dt { font-weight: 700; }',
    '    .meta dd { margin: 0; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <header>',
    `      <h1>${escapeHtml(title)}</h1>`,
    '    </header>',
    '    <section class="frame">',
    `      <canvas id="render-canvas-demo" data-canvas-demo-version="${CANVAS_2D_DEMO_VERSION}" data-scene="${escapeHtml(normalizedSnapshot.scene)}" data-tick="${normalizedSnapshot.tick}" width="${normalizedSnapshot.viewport.width}" height="${normalizedSnapshot.viewport.height}"></canvas>`,
    ...scriptLines,
    '    </section>',
    metadataBlock.trimEnd(),
    '  </main>',
    '</body>',
    '</html>',
    ''
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n');
}
