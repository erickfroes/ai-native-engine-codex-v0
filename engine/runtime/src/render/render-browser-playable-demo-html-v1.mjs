import { canonicalJSONStringify } from '../save/canonical-json.mjs';

export const BROWSER_PLAYABLE_DEMO_VERSION = 1;
export const DEFAULT_BROWSER_PLAYABLE_STEP_PX = 4;

const CAMERA_VIEWPORT_COMPONENT_KIND = 'camera.viewport';
const COLLISION_BOUNDS_COMPONENT_KIND = 'collision.bounds';
const TILE_LAYER_COMPONENT_KIND = 'tile.layer';

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

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function toInteger(value, fallback) {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function resolveTransformPosition(entity) {
  const transform = getComponent(entity, 'transform');
  const fields = transform?.fields ?? {};
  const position = fields.position && typeof fields.position === 'object'
    ? fields.position
    : fields;

  return {
    x: toInteger(position.x, 0),
    y: toInteger(position.y, 0)
  };
}

function resolveCameraPosition(scene) {
  const cameraEntity = (scene.entities ?? [])
    .find((entity) => getComponent(entity, CAMERA_VIEWPORT_COMPONENT_KIND));
  const fields = getComponent(cameraEntity ?? {}, CAMERA_VIEWPORT_COMPONENT_KIND)?.fields ?? {};

  return {
    x: toInteger(fields.x, 0),
    y: toInteger(fields.y, 0)
  };
}

function toScreenRect(rect, cameraPosition) {
  return {
    x: rect.x - cameraPosition.x,
    y: rect.y - cameraPosition.y,
    width: rect.width,
    height: rect.height
  };
}

function resolveEntityCollisionBounds(entity, cameraPosition) {
  const bounds = getComponent(entity, COLLISION_BOUNDS_COMPONENT_KIND)?.fields;
  if (!bounds || typeof bounds !== 'object') {
    return undefined;
  }

  const position = resolveTransformPosition(entity);
  return {
    id: entity.id,
    ...toScreenRect({
      x: position.x + toInteger(bounds.x, 0),
      y: position.y + toInteger(bounds.y, 0),
      width: toInteger(bounds.width, 0),
      height: toInteger(bounds.height, 0)
    }, cameraPosition),
    solid: bounds.solid === undefined ? true : bounds.solid === true
  };
}

function resolveTileCollisionBounds(entity, cameraPosition) {
  const tileLayer = getComponent(entity, TILE_LAYER_COMPONENT_KIND);
  const fields = tileLayer?.fields ?? {};
  const tiles = Array.isArray(fields.tiles) ? fields.tiles : [];
  const palette = fields.palette && typeof fields.palette === 'object' ? fields.palette : {};
  const tileBounds = [];

  for (const [rowIndex, row] of tiles.entries()) {
    if (!Array.isArray(row)) {
      continue;
    }

    for (const [columnIndex, tileId] of row.entries()) {
      const paletteId = String(tileId);
      const paletteEntry = palette[paletteId];
      if (!paletteEntry || paletteEntry.kind !== 'rect' || paletteEntry.solid !== true) {
        continue;
      }

      tileBounds.push({
        id: `${entity.id}.tile.${rowIndex}.${columnIndex}`,
        ...toScreenRect({
          x: columnIndex * fields.tileWidth,
          y: rowIndex * fields.tileHeight,
          width: paletteEntry.width ?? fields.tileWidth,
          height: paletteEntry.height ?? fields.tileHeight
        }, cameraPosition)
      });
    }
  }

  return tileBounds;
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

function normalizeDrawCall(drawCall, index) {
  assertObject(drawCall, `renderSnapshot.drawCalls[${index}]`);

  assertNonEmptyString(`renderSnapshot.drawCalls[${index}].id`, drawCall.id);
  assertInteger(`renderSnapshot.drawCalls[${index}].x`, drawCall.x);
  assertInteger(`renderSnapshot.drawCalls[${index}].y`, drawCall.y);
  assertInteger(`renderSnapshot.drawCalls[${index}].width`, drawCall.width, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].height`, drawCall.height, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].layer`, drawCall.layer);

  if (drawCall.kind !== 'rect' && drawCall.kind !== 'sprite') {
    throw new Error(`renderBrowserPlayableDemoHtmlV1: drawCalls[${index}].kind must be \`rect\` or \`sprite\``);
  }

  if (drawCall.kind === 'sprite') {
    assertNonEmptyString(`renderSnapshot.drawCalls[${index}].assetId`, drawCall.assetId);
    if (drawCall.assetSrc !== undefined) {
      assertNonEmptyString(`renderSnapshot.drawCalls[${index}].assetSrc`, drawCall.assetSrc);
    }
  }

  return {
    kind: drawCall.kind,
    id: drawCall.id,
    ...(drawCall.kind === 'sprite' ? { assetId: drawCall.assetId } : {}),
    ...(drawCall.kind === 'sprite' && drawCall.assetSrc !== undefined ? { assetSrc: drawCall.assetSrc } : {}),
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

  renderSnapshot.drawCalls.forEach(normalizeDrawCall);
}

function validateMetadata(metadata) {
  assertObject(metadata, 'metadata');

  if (metadata.controllableEntityId !== undefined) {
    assertNonEmptyString('metadata.controllableEntityId', metadata.controllableEntityId);
  }

  if (metadata.stepPx !== undefined) {
    assertInteger('metadata.stepPx', metadata.stepPx, 1);
  }

  if (metadata.movementBlocking !== undefined) {
    validateMovementBlockingMetadata(metadata.movementBlocking);
  }

  if (metadata.gameplayHud !== undefined) {
    validateGameplayHudMetadata(metadata.gameplayHud);
    const movementBlockingEnabled = metadata.movementBlocking?.enabled === true;
    if (metadata.gameplayHud.movementBlockingEnabled !== movementBlockingEnabled) {
      throw new Error(
        'renderBrowserPlayableDemoHtmlV1: `metadata.gameplayHud.movementBlockingEnabled` must match `metadata.movementBlocking.enabled`'
      );
    }
  }

  if (metadata.playableSaveLoad !== undefined) {
    validatePlayableSaveLoadMetadata(metadata.playableSaveLoad);
  }
}

function validateMetadataOverrides(overrides) {
  assertObject(overrides, 'metadata overrides');

  if (overrides.controllableEntityId !== undefined) {
    assertNonEmptyString('metadata.controllableEntityId', overrides.controllableEntityId);
  }

  if (overrides.stepPx !== undefined) {
    assertInteger('metadata.stepPx', overrides.stepPx, 1);
  }

  if (overrides.movementBlocking !== undefined && typeof overrides.movementBlocking !== 'boolean') {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.movementBlocking` override must be a boolean');
  }

  if (overrides.gameplayHud !== undefined && typeof overrides.gameplayHud !== 'boolean') {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.gameplayHud` override must be a boolean');
  }

  if (overrides.playableSaveLoad !== undefined && typeof overrides.playableSaveLoad !== 'boolean') {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.playableSaveLoad` override must be a boolean');
  }
}

function validateBoundsRect(value, name) {
  assertObject(value, name);
  assertNonEmptyString(`${name}.id`, value.id);
  assertInteger(`${name}.x`, value.x);
  assertInteger(`${name}.y`, value.y);
  assertInteger(`${name}.width`, value.width, 1);
  assertInteger(`${name}.height`, value.height, 1);
}

function validateControllableBounds(value, name) {
  assertObject(value, name);
  assertInteger(`${name}.offsetX`, value.offsetX);
  assertInteger(`${name}.offsetY`, value.offsetY);
  assertInteger(`${name}.width`, value.width, 1);
  assertInteger(`${name}.height`, value.height, 1);
}

function validateMovementBlockingMetadata(movementBlocking) {
  assertObject(movementBlocking, 'metadata.movementBlocking');

  if (movementBlocking.enabled !== true) {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.movementBlocking.enabled` must be exactly true');
  }

  if (movementBlocking.controllableBounds !== null) {
    validateControllableBounds(
      movementBlocking.controllableBounds,
      'metadata.movementBlocking.controllableBounds'
    );
  }

  if (!Array.isArray(movementBlocking.blockers)) {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.movementBlocking.blockers` must be an array');
  }

  movementBlocking.blockers.forEach((blocker, index) => {
    validateBoundsRect(blocker, `metadata.movementBlocking.blockers[${index}]`);
  });
}

function validateGameplayHudMetadata(gameplayHud) {
  assertObject(gameplayHud, 'metadata.gameplayHud');

  if (gameplayHud.enabled !== true) {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.gameplayHud.enabled` must be exactly true');
  }

  assertInteger('metadata.gameplayHud.snapshotTick', gameplayHud.snapshotTick, 0);

  if (typeof gameplayHud.movementBlockingEnabled !== 'boolean') {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.gameplayHud.movementBlockingEnabled` must be a boolean');
  }
}

function validatePlayableSaveLoadMetadata(playableSaveLoad) {
  assertObject(playableSaveLoad, 'metadata.playableSaveLoad');

  if (playableSaveLoad.enabled !== true) {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.playableSaveLoad.enabled` must be exactly true');
  }

  if (playableSaveLoad.kind !== 'browser.playable-demo.local-state') {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.playableSaveLoad.kind` must be `browser.playable-demo.local-state`');
  }

  if (playableSaveLoad.version !== 1) {
    throw new Error('renderBrowserPlayableDemoHtmlV1: `metadata.playableSaveLoad.version` must be exactly 1');
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

function createInitialGameplayHudRows(renderSnapshot, drawCalls, controllableEntityId, metadata) {
  const controllableDrawCall = drawCalls.find((drawCall) => drawCall.id === controllableEntityId);
  const movementBlockingEnabled = metadata.gameplayHud?.movementBlockingEnabled === true;

  return {
    entity: controllableDrawCall?.id ?? 'none',
    tick: renderSnapshot.tick,
    position: controllableDrawCall ? `x ${controllableDrawCall.x}, y ${controllableDrawCall.y}` : 'none',
    inputs: 0,
    blockedMoves: 0,
    lastInput: 'none',
    lastResult: 'idle',
    rendering: 'running',
    movementBlocking: movementBlockingEnabled ? 'enabled' : 'disabled'
  };
}

function renderGameplayHudBlock(rows) {
  if (!rows) {
    return '';
  }

  return [
    '      <dl id="browser-gameplay-hud" class="gameplay-hud" aria-label="Browser gameplay HUD lite">',
    '        <div>',
    '          <dt>Controlled entity</dt>',
    `          <dd id="browser-gameplay-hud-entity">${escapeHtml(rows.entity)}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Snapshot tick</dt>',
    `          <dd id="browser-gameplay-hud-tick">${rows.tick}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Position</dt>',
    `          <dd id="browser-gameplay-hud-position">${escapeHtml(rows.position)}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Inputs local</dt>',
    `          <dd id="browser-gameplay-hud-inputs">${rows.inputs}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Blocked moves</dt>',
    `          <dd id="browser-gameplay-hud-blocked-moves">${rows.blockedMoves}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Last input</dt>',
    `          <dd id="browser-gameplay-hud-last-input">${escapeHtml(rows.lastInput)}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Last result</dt>',
    `          <dd id="browser-gameplay-hud-last-result">${escapeHtml(rows.lastResult)}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Rendering</dt>',
    `          <dd id="browser-gameplay-hud-rendering">${escapeHtml(rows.rendering)}</dd>`,
    '        </div>',
    '        <div>',
    '          <dt>Movement blocking</dt>',
    `          <dd id="browser-gameplay-hud-movement-blocking">${escapeHtml(rows.movementBlocking)}</dd>`,
    '        </div>',
    '      </dl>'
  ].join('\n');
}

function renderPlayableSaveLoadBlock(enabled) {
  if (!enabled) {
    return '';
  }

  return [
    '      <section id="browser-playable-save-load" class="save-load" aria-label="Playable save load lite">',
    '        <h3>Playable Save/Load Lite</h3>',
    '        <p>Export or import this demo local state as deterministic JSON. It stays in this page and is not saved automatically.</p>',
    '        <div class="save-load-actions">',
    '          <button id="browser-playable-demo-export-state" type="button">Export State</button>',
    '          <button id="browser-playable-demo-import-state" type="button">Import State</button>',
    '        </div>',
    '        <textarea id="browser-playable-demo-local-state" rows="10" spellcheck="false" aria-label="Playable local state JSON"></textarea>',
    '        <p id="browser-playable-demo-save-load-status" class="save-load-status" aria-live="polite">No local state exported.</p>',
    '      </section>'
  ].join('\n');
}

function createMovementBlockingMetadata(scene, renderSnapshot, controllableEntityId) {
  const cameraPosition = resolveCameraPosition(scene);
  const controllableDrawCall = renderSnapshot.drawCalls.find((drawCall) => drawCall.id === controllableEntityId);
  const controllableEntity = (scene.entities ?? []).find((entity) => entity?.id === controllableEntityId);
  const controllableBounds = controllableEntity
    ? resolveEntityCollisionBounds(controllableEntity, cameraPosition)
    : undefined;
  const blockers = (scene.entities ?? [])
    .flatMap((entity) => {
      const entityBounds = resolveEntityCollisionBounds(entity, cameraPosition);
      const collisionBounds = entityBounds?.solid === true && entity.id !== controllableEntityId
        ? [{
            id: entityBounds.id,
            x: entityBounds.x,
            y: entityBounds.y,
            width: entityBounds.width,
            height: entityBounds.height
          }]
        : [];

      return [
        ...collisionBounds,
        ...resolveTileCollisionBounds(entity, cameraPosition)
      ];
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    enabled: true,
    controllableBounds: controllableDrawCall && controllableBounds?.solid === true
      ? {
          offsetX: controllableBounds.x - controllableDrawCall.x,
          offsetY: controllableBounds.y - controllableDrawCall.y,
          width: controllableBounds.width,
          height: controllableBounds.height
        }
      : null,
    blockers
  };
}

function createGameplayHudMetadata(renderSnapshot, movementBlockingEnabled) {
  return {
    enabled: true,
    movementBlockingEnabled,
    snapshotTick: renderSnapshot.tick
  };
}

function createPlayableSaveLoadMetadata() {
  return {
    enabled: true,
    kind: 'browser.playable-demo.local-state',
    version: 1
  };
}

export function createBrowserPlayableDemoMetadataV1(scene, renderSnapshot, overrides = {}) {
  assertObject(scene, 'scene');
  validateRenderSnapshot(renderSnapshot);
  validateMetadataOverrides(overrides);

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
    stepPx: overrides.stepPx ?? DEFAULT_BROWSER_PLAYABLE_STEP_PX,
    ...(overrides.movementBlocking === true
      ? { movementBlocking: createMovementBlockingMetadata(scene, renderSnapshot, controllableEntityId) }
      : {}),
    ...(overrides.gameplayHud === true
      ? { gameplayHud: createGameplayHudMetadata(renderSnapshot, overrides.movementBlocking === true) }
      : {}),
    ...(overrides.playableSaveLoad === true
      ? { playableSaveLoad: createPlayableSaveLoadMetadata() }
      : {})
  };
}

export function renderBrowserPlayableDemoHtmlV1({ title, renderSnapshot, metadata = {} }) {
  assertNonEmptyString('title', title);
  validateRenderSnapshot(renderSnapshot);
  validateMetadata(metadata);

  const resolvedTitle = title.trim();
  const controllableEntityId = resolveControllableEntityId(renderSnapshot.drawCalls, metadata.controllableEntityId);
  const playableSaveLoadEnabled = Boolean(metadata.playableSaveLoad && typeof controllableEntityId === 'string');
  const stepPx = metadata.stepPx ?? DEFAULT_BROWSER_PLAYABLE_STEP_PX;
  const normalizedMetadata = {
    ...(controllableEntityId ? { controllableEntityId } : {}),
    stepPx,
    ...(metadata.movementBlocking ? { movementBlocking: metadata.movementBlocking } : {}),
    ...(metadata.gameplayHud ? { gameplayHud: metadata.gameplayHud } : {}),
    ...(playableSaveLoadEnabled ? { playableSaveLoad: metadata.playableSaveLoad } : {})
  };
  const metadataEntries = normalizeMetadataEntries({
    ...(controllableEntityId ? { controllableEntityId } : {}),
    stepPx
  });
  const metadataBlock = renderMetadataBlock(metadataEntries);
  const initialStatusText = createInitialStatusText(
    renderSnapshot,
    renderSnapshot.drawCalls,
    controllableEntityId,
    stepPx
  );
  const initialPositionText = createInitialPositionText(renderSnapshot.drawCalls, controllableEntityId);
  const gameplayHudRows = metadata.gameplayHud
    ? createInitialGameplayHudRows(renderSnapshot, renderSnapshot.drawCalls, controllableEntityId, metadata)
    : null;
  const gameplayHudBlock = renderGameplayHudBlock(gameplayHudRows);
  const playableSaveLoadBlock = renderPlayableSaveLoadBlock(playableSaveLoadEnabled);
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
    ...(metadata.gameplayHud
      ? [
          '    .gameplay-hud { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 0 0 12px; padding: 12px; border: 1px dashed #9d8f7e; background: #fff8ec; }',
          '    .gameplay-hud div { display: grid; gap: 2px; }',
          '    .gameplay-hud dt { font-weight: 700; }',
          '    .gameplay-hud dd { margin: 0; }'
        ]
      : []),
    ...(playableSaveLoadEnabled
      ? [
          '    .save-load { display: grid; gap: 8px; margin: 12px 0 0; padding: 12px; border: 1px dashed #7e9170; background: #f5ffef; }',
          '    .save-load h3 { margin: 0; font-size: 1rem; }',
          '    .save-load p { margin: 0; }',
          '    .save-load-actions { display: flex; flex-wrap: wrap; gap: 8px; }',
          '    .save-load textarea { width: 100%; min-height: 140px; box-sizing: border-box; font: inherit; border: 1px solid #201a13; background: #fffdf8; color: #201a13; }',
          '    .save-load-status { font-weight: 700; }'
        ]
      : []),
    '    canvas { display: block; width: min(100%, 640px); height: auto; border: 1px solid #d7cfc2; background: #fffdf8; image-rendering: pixelated; }',
    '    canvas:focus { outline: 2px solid #201a13; outline-offset: 3px; }',
    '    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }',
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
    `      <p class="hint">Click the canvas, then use Arrow Keys or WASD to move the highlighted rectangle by ${stepPx} px per keydown. Pause rendering stops the local redraw loop. Reset restores the snapshot position.</p>`,
    `      <p id="browser-playable-demo-position" class="hud" aria-live="polite">${escapeHtml(initialPositionText)}</p>`,
    gameplayHudBlock,
    playableSaveLoadBlock,
    '      <noscript>This demo needs JavaScript enabled to capture keyboard input.</noscript>',
    `      <canvas id="browser-playable-demo-canvas" data-browser-demo-version="${BROWSER_PLAYABLE_DEMO_VERSION}" data-scene="${escapeHtml(renderSnapshot.scene)}" data-tick="${renderSnapshot.tick}" data-controllable-entity="${escapeHtml(controllableEntityId ?? '')}" width="${renderSnapshot.viewport.width}" height="${renderSnapshot.viewport.height}" tabindex="0" aria-label="Browser playable demo canvas" aria-describedby="browser-playable-demo-instructions browser-playable-demo-status"></canvas>`,
    '      <div class="actions">',
    '        <button id="browser-playable-demo-pause" type="button">Pause rendering</button>',
    `        <button id="browser-playable-demo-reset" type="button" aria-controls="browser-playable-demo-canvas"${controllableEntityId ? '' : ' disabled'}>Reset position</button>`,
    '      </div>',
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
    '      const pauseButton = document.getElementById("browser-playable-demo-pause");',
    '      const resetButton = document.getElementById("browser-playable-demo-reset");',
    '      const statusElement = document.getElementById("browser-playable-demo-status");',
    '      const payload = JSON.parse(dataElement.textContent);',
    ...(metadata.gameplayHud
      ? [
          '      const gameplayHudEnabled = payload.metadata.gameplayHud?.enabled === true;',
          '      const gameplayHudElements = gameplayHudEnabled',
          '        ? {',
          '            entity: document.getElementById("browser-gameplay-hud-entity"),',
          '            tick: document.getElementById("browser-gameplay-hud-tick"),',
          '            position: document.getElementById("browser-gameplay-hud-position"),',
          '            inputs: document.getElementById("browser-gameplay-hud-inputs"),',
          '            blockedMoves: document.getElementById("browser-gameplay-hud-blocked-moves"),',
          '            lastInput: document.getElementById("browser-gameplay-hud-last-input"),',
          '            lastResult: document.getElementById("browser-gameplay-hud-last-result"),',
          '            rendering: document.getElementById("browser-gameplay-hud-rendering"),',
          '            movementBlocking: document.getElementById("browser-gameplay-hud-movement-blocking")',
          '          }',
          '        : null;'
        ]
      : [
          '      const gameplayHudEnabled = false;',
          '      const gameplayHudElements = null;'
        ]),
    ...(playableSaveLoadEnabled
      ? [
          '      const playableSaveLoadEnabled = payload.metadata.playableSaveLoad?.enabled === true;',
          '      const exportStateButton = document.getElementById("browser-playable-demo-export-state");',
          '      const importStateButton = document.getElementById("browser-playable-demo-import-state");',
          '      const localStateTextArea = document.getElementById("browser-playable-demo-local-state");',
          '      const saveLoadStatusElement = document.getElementById("browser-playable-demo-save-load-status");'
        ]
      : [
          '      const playableSaveLoadEnabled = false;',
          '      const exportStateButton = null;',
          '      const importStateButton = null;',
          '      const localStateTextArea = null;',
          '      const saveLoadStatusElement = null;'
        ]),
    '      const context = canvas.getContext("2d");',
    '      if (!context) {',
    '        if (resetButton) {',
    '          resetButton.disabled = true;',
    '        }',
    '        statusElement.textContent = "Canvas 2D is unavailable in this browser.";',
    '        return;',
    '      }',
    '      const initialDrawCalls = payload.renderSnapshot.drawCalls.map((drawCall) => ({ ...drawCall }));',
    '      const drawCalls = initialDrawCalls.map((drawCall) => ({ ...drawCall }));',
    '      const spriteImageStateById = new Map();',
    '      function makeSpriteImageState(assetSrc) {',
    '        if (typeof Image !== "function") {',
    '          return { image: null, loaded: false, failed: true };',
    '        }',
    '        const image = new Image();',
    '        const state = {',
    '          image,',
    '          loaded: false,',
    '          failed: false',
    '        };',
    '        image.onload = () => {',
    '          state.loaded = true;',
    '          state.failed = false;',
    '          redraw();',
    '        };',
    '        image.onerror = () => {',
    '          state.loaded = false;',
    '          state.failed = true;',
    '          redraw();',
    '        };',
    '        image.src = assetSrc;',
    '        return state;',
    '      }',
    '      for (let index = 0; index < drawCalls.length; index += 1) {',
    '        const drawCall = drawCalls[index];',
    '        if (drawCall.kind === "sprite" && typeof drawCall.assetSrc === "string") {',
    '          spriteImageStateById.set(drawCall.id, makeSpriteImageState(drawCall.assetSrc));',
    '        }',
    '      }',
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
    '      let blockedMoveCount = 0;',
    '      let lastInput = "none";',
    '      let lastResult = "idle";',
    '      let animationFrameHandle = null;',
    '      let redrawLoopPaused = false;',
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
    '      function updateGameplayHud() {',
    '        if (!gameplayHudElements) {',
    '          return;',
    '        }',
    '        const controlled = controllableIndex === -1 ? null : drawCalls[controllableIndex];',
    '        gameplayHudElements.entity.textContent = controlled ? controlled.id : "none";',
    '        gameplayHudElements.tick.textContent = String(snapshotTick);',
    '        gameplayHudElements.position.textContent = controlled',
    '          ? "x " + controlled.x + ", y " + controlled.y',
    '          : "none";',
    '        gameplayHudElements.inputs.textContent = String(inputCount);',
    '        gameplayHudElements.blockedMoves.textContent = String(blockedMoveCount);',
    '        gameplayHudElements.lastInput.textContent = lastInput;',
    '        gameplayHudElements.lastResult.textContent = lastResult;',
    '        gameplayHudElements.rendering.textContent = redrawLoopPaused ? "paused" : "running";',
    '        gameplayHudElements.movementBlocking.textContent = payload.metadata.gameplayHud?.movementBlockingEnabled === true',
    '          ? "enabled"',
    '          : "disabled";',
    '      }',
    '      function updatePauseButton() {',
    '        pauseButton.textContent = redrawLoopPaused ? "Resume rendering" : "Pause rendering";',
    '      }',
    '      function buildPlayableLocalState() {',
    '        const controlled = controllableIndex === -1 ? null : drawCalls[controllableIndex];',
    '        const state = {',
    '          version: 1,',
    '          kind: "browser.playable-demo.local-state",',
    '          sceneId: payload.renderSnapshot.scene,',
    '          tick: snapshotTick,',
    '          controlledEntityId: controlled ? controlled.id : null,',
    '          positions: controlled ? [{ entityId: controlled.id, x: controlled.x, y: controlled.y }] : [],',
    '          options: {',
    '            movementBlocking: payload.metadata.movementBlocking?.enabled === true,',
    '            gameplayHud: gameplayHudEnabled,',
    '            playableSaveLoad: playableSaveLoadEnabled',
    '          }',
    '        };',
    '        if (gameplayHudEnabled) {',
    '          state.gameplayHud = {',
    '            inputs: inputCount,',
    '            blockedMoves: blockedMoveCount,',
    '            lastInput,',
    '            lastResult',
    '          };',
    '        }',
    '        return state;',
    '      }',
    '      function formatPlayableLocalState(state) {',
    '        return JSON.stringify(state, null, 2);',
    '      }',
    '      function updateSaveLoadStatus(message) {',
    '        if (saveLoadStatusElement) {',
    '          saveLoadStatusElement.textContent = message;',
    '        }',
    '      }',
    '      function exportPlayableLocalState() {',
    '        if (!localStateTextArea) {',
    '          return;',
    '        }',
    '        localStateTextArea.value = formatPlayableLocalState(buildPlayableLocalState());',
    '        updateSaveLoadStatus("Local state exported.");',
    '        canvas.focus();',
    '      }',
    '      function assertPlayableLocalState(condition, message) {',
    '        if (!condition) {',
    '          throw new Error(message);',
    '        }',
    '      }',
    '      function readPlayableLocalStatePosition(state) {',
    '        assertPlayableLocalState(state && typeof state === "object" && !Array.isArray(state), "state must be an object");',
    '        assertPlayableLocalState(state.version === 1, "version must be 1");',
    '        assertPlayableLocalState(state.kind === "browser.playable-demo.local-state", "kind is unsupported");',
    '        assertPlayableLocalState(state.sceneId === payload.renderSnapshot.scene, "sceneId does not match this demo");',
    '        assertPlayableLocalState(state.tick === snapshotTick, "tick does not match this demo");',
    '        const controlled = controllableIndex === -1 ? null : drawCalls[controllableIndex];',
    '        assertPlayableLocalState(controlled !== null, "this demo has no controllable entity");',
    '        assertPlayableLocalState(state.controlledEntityId === controlled.id, "controlledEntityId does not match this demo");',
    '        assertPlayableLocalState(Array.isArray(state.positions), "positions must be an array");',
    '        const position = state.positions.find((entry) => entry && entry.entityId === controlled.id);',
    '        assertPlayableLocalState(position !== undefined, "controlled position is missing");',
    '        assertPlayableLocalState(Number.isInteger(position.x), "position.x must be an integer");',
    '        assertPlayableLocalState(Number.isInteger(position.y), "position.y must be an integer");',
    '        if (state.options !== undefined) {',
    '          assertPlayableLocalState(state.options && typeof state.options === "object" && !Array.isArray(state.options), "options must be an object");',
    '          assertPlayableLocalState(state.options.playableSaveLoad === true, "options.playableSaveLoad must be true");',
    '          assertPlayableLocalState(state.options.gameplayHud === gameplayHudEnabled, "options.gameplayHud does not match this demo");',
    '          assertPlayableLocalState(state.options.movementBlocking === (payload.metadata.movementBlocking?.enabled === true), "options.movementBlocking does not match this demo");',
    '        }',
    '        return position;',
    '      }',
    '      function applyPlayableLocalState(state) {',
    '        const position = readPlayableLocalStatePosition(state);',
    '        if (movementWouldBeBlocked(position.x, position.y)) {',
    '          throw new Error("position is blocked in this demo");',
    '        }',
    '        const controlled = drawCalls[controllableIndex];',
    '        controlled.x = position.x;',
    '        controlled.y = position.y;',
    '        if (gameplayHudEnabled) {',
    '          const loadedHud = state.gameplayHud && typeof state.gameplayHud === "object" ? state.gameplayHud : {};',
    '          inputCount = Number.isInteger(loadedHud.inputs) ? loadedHud.inputs : 0;',
    '          blockedMoveCount = Number.isInteger(loadedHud.blockedMoves) ? loadedHud.blockedMoves : 0;',
    '          lastInput = typeof loadedHud.lastInput === "string" && loadedHud.lastInput.length > 0 ? loadedHud.lastInput : "none";',
    '          lastResult = typeof loadedHud.lastResult === "string" && loadedHud.lastResult.length > 0 ? loadedHud.lastResult : "loaded";',
    '        } else {',
    '          lastResult = "loaded";',
    '        }',
    '        redraw();',
    '        updateGameplayHud();',
    '        updateSaveLoadStatus("Local state imported.");',
    '        canvas.focus();',
    '      }',
    '      function importPlayableLocalState() {',
    '        if (!localStateTextArea) {',
    '          return;',
    '        }',
    '        try {',
    '          applyPlayableLocalState(JSON.parse(localStateTextArea.value));',
    '        } catch (error) {',
    '          updateSaveLoadStatus("Import failed: " + error.message);',
    '          canvas.focus();',
    '        }',
    '      }',
    '      function resetDrawCalls() {',
    '        drawCalls.length = 0;',
    '        for (let index = 0; index < initialDrawCalls.length; index += 1) {',
    '          drawCalls.push({ ...initialDrawCalls[index] });',
    '        }',
    '        inputCount = 0;',
    '        blockedMoveCount = 0;',
    '        lastInput = "none";',
    '        lastResult = "reset";',
    '        updateSaveLoadStatus("Local state reset.");',
    '      }',
    '      function resetControlledPosition() {',
    '        if (controllableIndex === -1 || initialControlledPosition === null) {',
    '          return;',
    '        }',
    '        resetDrawCalls();',
    '        redraw();',
    '        updateGameplayHud();',
    '        canvas.focus();',
    '      }',
    '      function redraw() {',
    '        context.clearRect(0, 0, canvas.width, canvas.height);',
    '        context.strokeStyle = "#201a13";',
    '        context.lineWidth = 1;',
    '        for (let index = 0; index < drawCalls.length; index += 1) {',
    '          const drawCall = drawCalls[index];',
    '          const isControlled = index === controllableIndex;',
    '          const fillStyle = isControlled ? "#b74f2a" : "#201a13";',
    '          const spriteImageState = drawCall.kind === "sprite" ? spriteImageStateById.get(drawCall.id) : undefined;',
    '          const canDrawImage = spriteImageState !== undefined && spriteImageState.loaded && !spriteImageState.failed;',
    '          if (canDrawImage) {',
    '            try {',
    '              context.drawImage(',
    '                spriteImageState.image,',
    '                drawCall.x,',
    '                drawCall.y,',
    '                drawCall.width,',
    '                drawCall.height',
    '              );',
    '              context.strokeRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '              continue;',
    '            } catch (error) {',
    '              spriteImageState.failed = true;',
    '            }',
    '          }',
    '          context.fillStyle = fillStyle;',
    '          context.fillRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '          context.strokeRect(drawCall.x, drawCall.y, drawCall.width, drawCall.height);',
    '        }',
    '        updatePositionHud();',
    '        updateStatus();',
    '      }',
    '      function scheduleRedrawLoop() {',
    '        if (redrawLoopPaused || animationFrameHandle !== null) {',
    '          return;',
    '        }',
    '        animationFrameHandle = requestAnimationFrame(renderFrame);',
    '      }',
    '      function renderFrame() {',
    '        animationFrameHandle = null;',
    '        if (redrawLoopPaused) {',
    '          return;',
    '        }',
    '        redraw();',
    '        scheduleRedrawLoop();',
    '      }',
    '      function setRedrawLoopPaused(nextPaused) {',
    '        if (redrawLoopPaused === nextPaused) {',
    '          return;',
    '        }',
    '        redrawLoopPaused = nextPaused;',
    '        if (redrawLoopPaused) {',
    '          if (animationFrameHandle !== null) {',
    '            cancelAnimationFrame(animationFrameHandle);',
    '            animationFrameHandle = null;',
    '          }',
    '        } else {',
    '          redraw();',
    '          scheduleRedrawLoop();',
    '        }',
    '        updatePauseButton();',
    '        updateGameplayHud();',
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
    '      function boundsOverlap(left, right) {',
    '        return (',
    '          left.x < right.x + right.width &&',
    '          left.x + left.width > right.x &&',
    '          left.y < right.y + right.height &&',
    '          left.y + left.height > right.y',
    '        );',
    '      }',
    '      function movementWouldBeBlocked(candidateX, candidateY) {',
    '        const movementBlocking = payload.metadata.movementBlocking;',
    '        if (!movementBlocking || movementBlocking.enabled !== true || movementBlocking.controllableBounds === null) {',
    '          return false;',
    '        }',
    '        const candidateBounds = {',
    '          x: candidateX + movementBlocking.controllableBounds.offsetX,',
    '          y: candidateY + movementBlocking.controllableBounds.offsetY,',
    '          width: movementBlocking.controllableBounds.width,',
    '          height: movementBlocking.controllableBounds.height',
    '        };',
    '        return movementBlocking.blockers.some((blocker) => boundsOverlap(candidateBounds, blocker));',
    '      }',
    '      canvas.addEventListener("click", () => {',
    '        canvas.focus();',
    '      });',
    '      pauseButton.addEventListener("click", () => {',
    '        setRedrawLoopPaused(!redrawLoopPaused);',
    '      });',
    '      resetButton.addEventListener("click", () => {',
    '        resetControlledPosition();',
    '      });',
    '      if (exportStateButton) {',
    '        exportStateButton.addEventListener("click", exportPlayableLocalState);',
    '      }',
    '      if (importStateButton) {',
    '        importStateButton.addEventListener("click", importPlayableLocalState);',
    '      }',
    '      canvas.addEventListener("keydown", (event) => {',
    '        const delta = getMovementDelta(event.code);',
    '        if (!delta) {',
    '          lastInput = event.code || "unknown";',
    '          lastResult = "ignored";',
    '          updateGameplayHud();',
    '          return;',
    '        }',
    '        if (controllableIndex === -1) {',
    '          lastInput = event.code || "unknown";',
    '          lastResult = "ignored";',
    '          updateGameplayHud();',
    '          return;',
    '        }',
    '        event.preventDefault();',
    '        const controlled = drawCalls[controllableIndex];',
    '        const candidateX = controlled.x + delta.x * stepPx;',
    '        const candidateY = controlled.y + delta.y * stepPx;',
    '        lastInput = event.code || "unknown";',
    '        if (movementWouldBeBlocked(candidateX, candidateY)) {',
    '          blockedMoveCount += 1;',
    '          lastResult = "blocked";',
    '          redraw();',
    '          updateGameplayHud();',
    '          return;',
    '        }',
    '        controlled.x = candidateX;',
    '        controlled.y = candidateY;',
    '        inputCount += 1;',
    '        lastResult = "moved";',
    '        redraw();',
    '        updateGameplayHud();',
    '      });',
    '      updatePauseButton();',
    '      redraw();',
    '      updateGameplayHud();',
    '      scheduleRedrawLoop();',
    '      canvas.focus();',
    '    })();',
    '  </script>',
    '</body>',
    '</html>',
    ''
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n');
}
