import { canonicalJSONStringify } from '../save/canonical-json.mjs';

export const BROWSER_PLAYABLE_DEMO_VERSION = 1;
export const DEFAULT_BROWSER_PLAYABLE_STEP_PX = 4;

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`renderBrowserPlayableDemoHtmlV1: \`${name}\` must be an object`);
  }
}

function assertInteger(name, value, minimum = undefined) {
  if (!Number.isInteger(value) || (minimum !== undefined && value < minimum)) {
    const suffix = minimum === undefined ? 'an integer' : `an integer >= ${minimum}`;
    throw new Error(`renderBrowserPlayableDemoHtmlV1: \`${name}\` must be ${suffix}`);
  }
}

function assertNonEmptyString(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`renderBrowserPlayableDemoHtmlV1: \`${name}\` must be a non-empty string`);
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

function escapeInlineJson(value) {
  return canonicalJSONStringify(value)
    .replaceAll('&', '\\u0026')
    .replaceAll('<', '\\u003C')
    .replaceAll('>', '\\u003E')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function normalizeRectDrawCall(drawCall, index) {
  assertObject(drawCall, `renderSnapshot.drawCalls[${index}]`);
  if (drawCall.kind !== 'rect') {
    throw new Error(`renderBrowserPlayableDemoHtmlV1: drawCalls[${index}].kind must be \`rect\``);
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

function validateRenderSnapshot(renderSnapshot) {
  assertObject(renderSnapshot, 'renderSnapshot');
  assertInteger('renderSnapshot.renderSnapshotVersion', renderSnapshot.renderSnapshotVersion, 1);
  if (renderSnapshot.renderSnapshotVersion !== 1) {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `renderSnapshot.renderSnapshotVersion` must be exactly 1');
  }

  assertNonEmptyString('renderSnapshot.scene', renderSnapshot.scene);
  assertInteger('renderSnapshot.tick', renderSnapshot.tick, 0);
  assertObject(renderSnapshot.viewport, 'renderSnapshot.viewport');
  assertInteger('renderSnapshot.viewport.width', renderSnapshot.viewport.width, 1);
  assertInteger('renderSnapshot.viewport.height', renderSnapshot.viewport.height, 1);

  if (!Array.isArray(renderSnapshot.drawCalls)) {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `renderSnapshot.drawCalls` must be an array');
  }

  renderSnapshot.drawCalls.forEach(normalizeRectDrawCall);
}

function validateMetadata(metadata) {
  assertObject(metadata, 'metadata');

  if (metadata.controllableEntityId !== undefined) {
    assertNonEmptyString('metadata.controllableEntityId', metadata.controllableEntityId);
  }

  if (metadata.stepPx !== undefined) {
    assertInteger('metadata.stepPx', metadata.stepPx, 1);
  }
}

function normalizeMetadataEntries(metadata) {
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

function resolveControllableEntityId(drawCalls, preferredEntityId) {
  if (typeof preferredEntityId === 'string') {
    const matched = drawCalls.find((drawCall) => drawCall.id === preferredEntityId);
    if (matched) {
      return matched.id;
    }
  }

  return drawCalls[0]?.id;
}

function createInitialStatusText(renderSnapshot, drawCalls, controllableEntityId, stepPx) {
  const controllableDrawCall = drawCalls.find((drawCall) => drawCall.id === controllableEntityId);

  if (!controllableDrawCall) {
    return `Snapshot tick ${renderSnapshot.tick}. No controllable rect. Step ${stepPx} px.`;
  }

  return `Snapshot tick ${renderSnapshot.tick}. Inputs 0. Controlled rect ${controllableDrawCall.id} at (${controllableDrawCall.x}, ${controllableDrawCall.y}). Step ${stepPx} px.`;
}

function createInitialPositionText(drawCalls, controllableEntityId) {
  const controllableDrawCall = drawCalls.find((drawCall) => drawCall.id === controllableEntityId);

  if (!controllableDrawCall) {
    return 'Position: none';
  }

  return `Position: x ${controllableDrawCall.x}, y ${controllableDrawCall.y}`;
}

export function createBrowserPlayableDemoMetadataV1(scene, renderSnapshot, overrides = {}) {
  assertObject(scene, 'scene');
  validateRenderSnapshot(renderSnapshot);
  validateMetadata(overrides);

  const drawCallIds = new Set(renderSnapshot.drawCalls.map((drawCall) => drawCall.id));
  const sceneEntities = Array.isArray(scene.entities) ? scene.entities : [];
  const scenePreferredEntityId = sceneEntities
    .map((entity) => entity?.id)
    .find((entityId) => typeof entityId === 'string' && drawCallIds.has(entityId));

  const controllableEntityId =
    overrides.controllableEntityId ??
    scenePreferredEntityId ??
    renderSnapshot.drawCalls[0]?.id;

  return {
    ...(controllableEntityId ? { controllableEntityId } : {}),
    stepPx: overrides.stepPx ?? DEFAULT_BROWSER_PLAYABLE_STEP_PX
  };
}

export function renderBrowserPlayableDemoHtmlV1({ title, renderSnapshot, metadata = {} }) {
  assertNonEmptyString('title', title);
  validateRenderSnapshot(renderSnapshot);
  validateMetadata(metadata);

  const resolvedTitle = title.trim();
  const controllableEntityId = resolveControllableEntityId(renderSnapshot.drawCalls, metadata.controllableEntityId);
  const stepPx = metadata.stepPx ?? DEFAULT_BROWSER_PLAYABLE_STEP_PX;
  const normalizedMetadata = {
    ...(controllableEntityId ? { controllableEntityId } : {}),
    stepPx
  };
  const metadataEntries = normalizeMetadataEntries(normalizedMetadata);
  const metadataBlock = renderMetadataBlock(metadataEntries);
  const initialStatusText = createInitialStatusText(
    renderSnapshot,
    renderSnapshot.drawCalls,
    controllableEntityId,
    stepPx
  );
  const initialPositionText = createInitialPositionText(renderSnapshot.drawCalls, controllableEntityId);
  const inlineData = escapeInlineJson({
    metadata: normalizedMetadata,
    renderSnapshot,
    version: BROWSER_PLAYABLE_DEMO_VERSION
  });

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(resolvedTitle)}</title>`,
    '  <style>',
    '    :root { color-scheme: light; }',
    '    body { margin: 0; padding: 24px; font-family: "Courier New", monospace; background: #f4efe6; color: #201a13; }',
    '    main { display: grid; gap: 16px; max-width: 960px; margin: 0 auto; }',
    '    .frame { background: #fffdf8; border: 1px solid #d7cfc2; padding: 16px; overflow: auto; }',
    '    .instructions { display: grid; gap: 8px; margin: 0 0 12px; }',
    '    .instructions h2 { margin: 0; font-size: 1rem; }',
    '    .instructions p { margin: 0; }',
    '    .controls-list { display: grid; gap: 4px; margin: 0; padding-left: 20px; }',
    '    .hint { margin: 0 0 12px; }',
    '    .hud { margin: 0 0 12px; font-weight: 700; }',
    '    canvas { display: block; width: min(100%, 640px); height: auto; border: 1px solid #d7cfc2; background: #fffdf8; image-rendering: pixelated; }',
    '    canvas:focus { outline: 2px solid #201a13; outline-offset: 3px; }',
    '    .actions { display: flex; gap: 12px; margin-top: 12px; }',
    '    button { font: inherit; padding: 8px 12px; border: 1px solid #201a13; background: #fffdf8; color: #201a13; cursor: pointer; }',
    '    button:focus { outline: 2px solid #201a13; outline-offset: 3px; }',
    '    button:disabled { cursor: not-allowed; opacity: 0.6; }',
    '    .meta { display: grid; gap: 8px; margin: 0; }',
    '    .meta div { display: grid; gap: 2px; }',
    '    .meta dt { font-weight: 700; }',
    '    .meta dd { margin: 0; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <header>',
    `      <h1>${escapeHtml(resolvedTitle)}</h1>`,
    '    </header>',
    '    <section class="frame" aria-labelledby="browser-playable-demo-instructions-title">',
    '      <div class="instructions">',
    `        <h2 id="browser-playable-demo-instructions-title">${escapeHtml(resolvedTitle)}</h2>`,
    '        <p id="browser-playable-demo-instructions">Click the canvas and use WASD or Arrow Keys to move.</p>',
    '        <ul class="controls-list" aria-label="Controls">',
    `          <li>W or ArrowUp moves up by ${stepPx} px.</li>`,
    `          <li>A or ArrowLeft moves left by ${stepPx} px.</li>`,
    `          <li>S or ArrowDown moves down by ${stepPx} px.</li>`,
    `          <li>D or ArrowRight moves right by ${stepPx} px.</li>`,
    '        </ul>',
    '      </div>',
    `      <p class="hint">Click the canvas, then use Arrow Keys or WASD to move the highlighted rectangle by ${stepPx} px per keydown.</p>`,
    `      <p id="browser-playable-demo-position" class="hud" aria-live="polite">${escapeHtml(initialPositionText)}</p>`,
    '      <noscript>This demo needs JavaScript enabled to capture keyboard input.</noscript>',
    `      <canvas id="browser-playable-demo-canvas" data-browser-demo-version="${BROWSER_PLAYABLE_DEMO_VERSION}" data-scene="${escapeHtml(renderSnapshot.scene)}" data-tick="${renderSnapshot.tick}" data-controllable-entity="${escapeHtml(controllableEntityId ?? '')}" width="${renderSnapshot.viewport.width}" height="${renderSnapshot.viewport.height}" tabindex="0" aria-label="Browser playable demo canvas" aria-describedby="browser-playable-demo-instructions browser-playable-demo-status"></canvas>`,
    `      <div class="actions"><button id="browser-playable-demo-reset" type="button" aria-controls="browser-playable-demo-canvas"${controllableEntityId ? '' : ' disabled'}>Reset position</button></div>`,
    '    </section>',
    '    <section class="frame">',
    `      <p id="browser-playable-demo-status" aria-live="polite">${escapeHtml(initialStatusText)}</p>`,
    '    </section>',
    metadataBlock.trimEnd(),
    '  </main>',
    `  <script id="browser-playable-demo-data" type="application/json">${inlineData}</script>`,
    '  <script>',
    '    (() => {',
    '      const dataElement = document.getElementById("browser-playable-demo-data");',
    '      const canvas = document.getElementById("browser-playable-demo-canvas");',
    '      const positionElement = document.getElementById("browser-playable-demo-position");',
    '      const resetButton = document.getElementById("browser-playable-demo-reset");',
    '      const statusElement = document.getElementById("browser-playable-demo-status");',
    '      const payload = JSON.parse(dataElement.textContent);',
    '      const context = canvas.getContext("2d");',
    '      if (!context) {',
    '        if (resetButton) {',
    '          resetButton.disabled = true;',
    '        }',
    '        statusElement.textContent = "Canvas 2D is unavailable in this browser.";',
    '        return;',
    '      }',
    '      const drawCalls = payload.renderSnapshot.drawCalls.map((drawCall) => ({ ...drawCall }));',
    '      const controllableEntityId = payload.metadata.controllableEntityId ?? null;',
    '      let controllableIndex = controllableEntityId === null',
    '        ? -1',
    '        : drawCalls.findIndex((drawCall) => drawCall.id === controllableEntityId);',
    '      if (controllableIndex === -1 && drawCalls.length > 0) {',
    '        controllableIndex = 0;',
    '      }',
    '      const initialControlledPosition = controllableIndex === -1',
    '        ? null',
    '        : { x: drawCalls[controllableIndex].x, y: drawCalls[controllableIndex].y };',
    '      const stepPx = payload.metadata.stepPx;',
    '      const snapshotTick = payload.renderSnapshot.tick;',
    '      let inputCount = 0;',
    '      if (resetButton && controllableIndex === -1) {',
    '        resetButton.disabled = true;',
    '      }',
    '      function updatePositionHud() {',
    '        if (controllableIndex === -1) {',
    '          positionElement.textContent = "Position: none";',
    '          return;',
    '        }',
    '        const controlled = drawCalls[controllableIndex];',
    '        positionElement.textContent = "Position: x " + controlled.x + ", y " + controlled.y;',
    '      }',
    '      function updateStatus() {',
    '        if (controllableIndex === -1) {',
    '          statusElement.textContent = "Snapshot tick " + snapshotTick + ". No controllable rect. Step " + stepPx + " px.";',
    '          return;',
    '        }',
    '        const controlled = drawCalls[controllableIndex];',
    '        statusElement.textContent =',
    '          "Snapshot tick " +',
    '          snapshotTick +',
    '          ". Inputs " +',
    '          inputCount +',
    '          ". Controlled rect " +',
    '          controlled.id +',
    '          " at (" +',
    '          controlled.x +',
    '          ", " +',
    '          controlled.y +',
    '          "). Step " +',
    '          stepPx +',
    '          " px.";',
    '      }',
    '      function resetControlledPosition() {',
    '        if (controllableIndex === -1 || initialControlledPosition === null) {',
    '          return;',
    '        }',
    '        drawCalls[controllableIndex].x = initialControlledPosition.x;',
    '        drawCalls[controllableIndex].y = initialControlledPosition.y;',
    '        redraw();',
    '        canvas.focus();',
    '      }',
    '      function redraw() {',
    '        context.clearRect(0, 0, canvas.width, canvas.height);',
    '        context.strokeStyle = "#201a13";',
    '        context.lineWidth = 1;',
    '        for (let index = 0; index < drawCalls.length; index += 1) {',
    '          const drawCall = drawCalls[index];',
    '          context.fillStyle = index === controllableIndex ? "#b74f2a" : "#201a13";',
    '          context.fillRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '          context.strokeRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '        }',
    '        updatePositionHud();',
    '        updateStatus();',
    '      }',
    '      function getMovementDelta(code) {',
    '        if (code === "ArrowRight" || code === "KeyD") {',
    '          return { x: 1, y: 0 };',
    '        }',
    '        if (code === "ArrowLeft" || code === "KeyA") {',
    '          return { x: -1, y: 0 };',
    '        }',
    '        if (code === "ArrowUp" || code === "KeyW") {',
    '          return { x: 0, y: -1 };',
    '        }',
    '        if (code === "ArrowDown" || code === "KeyS") {',
    '          return { x: 0, y: 1 };',
    '        }',
    '        return undefined;',
    '      }',
    '      canvas.addEventListener("click", () => {',
    '        canvas.focus();',
    '      });',
    '      if (resetButton) {',
    '        resetButton.addEventListener("click", () => {',
    '          resetControlledPosition();',
    '        });',
    '      }',
    '      canvas.addEventListener("keydown", (event) => {',
    '        const delta = getMovementDelta(event.code);',
    '        if (!delta || controllableIndex === -1) {',
    '          return;',
    '        }',
    '        event.preventDefault();',
    '        drawCalls[controllableIndex].x += delta.x * stepPx;',
    '        drawCalls[controllableIndex].y += delta.y * stepPx;',
    '        inputCount += 1;',
    '        redraw();',
    '      });',
    '      redraw();',
    '      canvas.focus();',
    '    })();',
    '  </script>',
    '</body>',
    '</html>',
    ''
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n');
}
