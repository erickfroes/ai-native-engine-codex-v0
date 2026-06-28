import { isPrefabDocumentPath } from './prefab-v1.mjs';

function pushMessage(collection, path, message) {
  collection.push({ path, message });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidTileId(value) {
  return Number.isInteger(value) || (typeof value === 'string' && value.trim().length > 0);
}

function isSafeRelativePath(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();
  return (
    !trimmed.includes('://') &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('\\') &&
    !/^[A-Za-z]:[\\/]/.test(trimmed) &&
    !trimmed.split(/[\\/]+/).includes('..')
  );
}

function hasSafePrefabReference(entity) {
  return typeof entity?.prefab === 'string' && entity.prefab.trim().length > 0;
}

function validateVisualSpriteComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set(['assetId', 'atlasBindingId', 'width', 'height', 'layer']);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'visual.sprite version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'visual.sprite must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'visual.sprite fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for visual.sprite');
    }
  }

  if (typeof fields.assetId !== 'string' || fields.assetId.trim().length === 0) {
    pushMessage(errors, `${componentPath}.fields.assetId`, 'visual.sprite assetId must be a non-empty string');
  }

  if (
    fields.atlasBindingId !== undefined &&
    (typeof fields.atlasBindingId !== 'string' || fields.atlasBindingId.trim().length === 0)
  ) {
    pushMessage(errors, `${componentPath}.fields.atlasBindingId`, 'visual.sprite atlasBindingId must be a non-empty string when provided');
  }

  for (const dimensionName of ['width', 'height']) {
    if (
      fields[dimensionName] !== undefined &&
      (!Number.isInteger(fields[dimensionName]) || fields[dimensionName] < 1)
    ) {
      pushMessage(errors, `${componentPath}.fields.${dimensionName}`, 'visual.sprite dimensions must be integers >= 1');
    }
  }

  if (fields.layer !== undefined && !Number.isInteger(fields.layer)) {
    pushMessage(errors, `${componentPath}.fields.layer`, 'visual.sprite layer must be an integer');
  }
}

function validateTileLayerPaletteEntry(entry, entryPath, errors) {
  if (!isPlainObject(entry)) {
    pushMessage(errors, entryPath, 'tile.layer palette entry must be an object');
    return;
  }

  if (entry.kind === 'empty') {
    for (const fieldName of Object.keys(entry)) {
      if (fieldName !== 'kind') {
        pushMessage(errors, `${entryPath}.${fieldName}`, 'is not allowed for tile.layer empty palette entry');
      }
    }
    return;
  }

  if (entry.kind === 'rect') {
    const allowedFieldNames = new Set(['kind', 'width', 'height', 'solid']);
    for (const fieldName of Object.keys(entry)) {
      if (!allowedFieldNames.has(fieldName)) {
        pushMessage(errors, `${entryPath}.${fieldName}`, 'is not allowed for tile.layer rect palette entry');
      }
    }

    for (const dimensionName of ['width', 'height']) {
      if (
        entry[dimensionName] !== undefined &&
        (!Number.isInteger(entry[dimensionName]) || entry[dimensionName] < 1)
      ) {
        pushMessage(
          errors,
          `${entryPath}.${dimensionName}`,
          `tile.layer palette rect ${dimensionName} must be an integer >= 1`
        );
      }
    }

    if (entry.solid !== undefined && typeof entry.solid !== 'boolean') {
      pushMessage(errors, `${entryPath}.solid`, 'tile.layer palette rect solid must be a boolean when provided');
    }
    return;
  }

  pushMessage(errors, `${entryPath}.kind`, 'tile.layer palette entry kind must be `empty` or `rect`');
}

function validateTileLayerComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set([
    'tileWidth',
    'tileHeight',
    'columns',
    'rows',
    'layer',
    'tiles',
    'palette'
  ]);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'tile.layer version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'tile.layer must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'tile.layer fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for tile.layer');
    }
  }

  for (const dimensionName of ['tileWidth', 'tileHeight', 'columns', 'rows']) {
    if (!Number.isInteger(fields[dimensionName]) || fields[dimensionName] < 1) {
      pushMessage(
        errors,
        `${componentPath}.fields.${dimensionName}`,
        `tile.layer ${dimensionName} must be an integer >= 1`
      );
    }
  }

  if (fields.layer !== undefined && !Number.isInteger(fields.layer)) {
    pushMessage(errors, `${componentPath}.fields.layer`, 'tile.layer layer must be an integer');
  }

  const paletteIds = new Set();
  if (!isPlainObject(fields.palette)) {
    pushMessage(errors, `${componentPath}.fields.palette`, 'tile.layer palette must be an object');
  } else {
    const paletteKeys = Object.keys(fields.palette);
    if (paletteKeys.length === 0) {
      pushMessage(errors, `${componentPath}.fields.palette`, 'tile.layer palette must define at least one tile');
    }

    for (const tileId of paletteKeys) {
      if (tileId.trim().length === 0) {
        pushMessage(errors, `${componentPath}.fields.palette`, 'tile.layer palette tile ids must be non-empty strings');
      } else {
        paletteIds.add(tileId);
      }
      validateTileLayerPaletteEntry(
        fields.palette[tileId],
        `${componentPath}.fields.palette.${JSON.stringify(tileId)}`,
        errors
      );
    }
  }

  if (!Array.isArray(fields.tiles)) {
    pushMessage(errors, `${componentPath}.fields.tiles`, 'tile.layer tiles must be an array of rows');
    return;
  }

  if (Number.isInteger(fields.rows) && fields.rows >= 1 && fields.tiles.length !== fields.rows) {
    pushMessage(errors, `${componentPath}.fields.tiles`, 'tile.layer tiles row count must equal rows');
  }

  for (const [rowIndex, row] of fields.tiles.entries()) {
    const rowPath = `${componentPath}.fields.tiles[${rowIndex}]`;
    if (!Array.isArray(row)) {
      pushMessage(errors, rowPath, 'tile.layer tiles row must be an array');
      continue;
    }

    if (Number.isInteger(fields.columns) && fields.columns >= 1 && row.length !== fields.columns) {
      pushMessage(errors, rowPath, 'tile.layer tiles column count must equal columns');
    }

    for (const [columnIndex, tileId] of row.entries()) {
      const tilePath = `${rowPath}[${columnIndex}]`;
      if (!isValidTileId(tileId)) {
        pushMessage(errors, tilePath, 'tile.layer tile id must be an integer or non-empty string');
        continue;
      }

      const paletteId = String(tileId);
      if (isPlainObject(fields.palette) && !paletteIds.has(paletteId)) {
        pushMessage(errors, tilePath, `tile.layer tile id \`${paletteId}\` must exist in palette`);
      }
    }
  }
}

function validateCameraViewportComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set(['x', 'y', 'width', 'height']);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'camera.viewport version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'camera.viewport must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'camera.viewport fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for camera.viewport');
    }
  }

  for (const coordinateName of ['x', 'y']) {
    if (!Number.isInteger(fields[coordinateName])) {
      pushMessage(
        errors,
        `${componentPath}.fields.${coordinateName}`,
        `camera.viewport ${coordinateName} must be an integer`
      );
    }
  }

  for (const dimensionName of ['width', 'height']) {
    if (!Number.isInteger(fields[dimensionName]) || fields[dimensionName] < 1) {
      pushMessage(
        errors,
        `${componentPath}.fields.${dimensionName}`,
        `camera.viewport ${dimensionName} must be an integer >= 1`
      );
    }
  }
}

function validateCollisionBoundsComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set(['x', 'y', 'width', 'height', 'solid']);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'collision.bounds version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'collision.bounds must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'collision.bounds fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for collision.bounds');
    }
  }

  for (const coordinateName of ['x', 'y']) {
    if (fields[coordinateName] !== undefined && !Number.isInteger(fields[coordinateName])) {
      pushMessage(
        errors,
        `${componentPath}.fields.${coordinateName}`,
        `collision.bounds ${coordinateName} must be an integer when provided`
      );
    }
  }

  for (const dimensionName of ['width', 'height']) {
    if (!Number.isInteger(fields[dimensionName]) || fields[dimensionName] < 1) {
      pushMessage(
        errors,
        `${componentPath}.fields.${dimensionName}`,
        `collision.bounds ${dimensionName} must be an integer >= 1`
      );
    }
  }

  if (fields.solid !== undefined && typeof fields.solid !== 'boolean') {
    pushMessage(errors, `${componentPath}.fields.solid`, 'collision.bounds solid must be a boolean when provided');
  }
}


function validateSpriteAnimationComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set([
    'animationId',
    'assetId',
    'frameWidth',
    'frameHeight',
    'frames',
    'fps',
    'loop',
    'state'
  ]);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'visual.sprite.animation version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'visual.sprite.animation must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'visual.sprite.animation fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for visual.sprite.animation');
    }
  }

  if (typeof fields.animationId !== 'string' || fields.animationId.trim().length === 0) {
    pushMessage(errors, `${componentPath}.fields.animationId`, 'visual.sprite.animation animationId must be a non-empty string');
  }

  if (typeof fields.assetId !== 'string' || fields.assetId.trim().length === 0) {
    pushMessage(errors, `${componentPath}.fields.assetId`, 'visual.sprite.animation assetId must be a non-empty string');
  }

  if (!Number.isInteger(fields.frameWidth) || fields.frameWidth < 1) {
    pushMessage(errors, `${componentPath}.fields.frameWidth`, 'visual.sprite.animation frameWidth must be an integer >= 1');
  }

  if (!Number.isInteger(fields.frameHeight) || fields.frameHeight < 1) {
    pushMessage(errors, `${componentPath}.fields.frameHeight`, 'visual.sprite.animation frameHeight must be an integer >= 1');
  }

  if (!Number.isInteger(fields.fps) || fields.fps < 1 || fields.fps > 60) {
    pushMessage(errors, `${componentPath}.fields.fps`, 'visual.sprite.animation fps must be an integer between 1 and 60');
  }

  if (!Array.isArray(fields.frames) || fields.frames.length === 0) {
    pushMessage(errors, `${componentPath}.fields.frames`, 'visual.sprite.animation frames must be a non-empty array');
  } else {
    for (const [frameIndex, frame] of fields.frames.entries()) {
      const framePath = `${componentPath}.fields.frames[${frameIndex}]`;

      if (!isPlainObject(frame)) {
        pushMessage(errors, framePath, 'visual.sprite.animation frame must be an object');
        continue;
      }

      for (const fieldName of Object.keys(frame)) {
        if (fieldName !== 'x' && fieldName !== 'y') {
          pushMessage(errors, `${framePath}.${fieldName}`, 'is not allowed for visual.sprite.animation frame');
        }
      }

      if (!Number.isInteger(frame.x) || frame.x < 0) {
        pushMessage(errors, `${framePath}.x`, 'visual.sprite.animation frame x must be an integer >= 0');
      }

      if (!Number.isInteger(frame.y) || frame.y < 0) {
        pushMessage(errors, `${framePath}.y`, 'visual.sprite.animation frame y must be an integer >= 0');
      }
    }
  }

  if (fields.loop !== undefined && typeof fields.loop !== 'boolean') {
    pushMessage(errors, `${componentPath}.fields.loop`, 'visual.sprite.animation loop must be a boolean when provided');
  }

  if (fields.state !== undefined && (typeof fields.state !== 'string' || fields.state.trim().length === 0)) {
    pushMessage(errors, `${componentPath}.fields.state`, 'visual.sprite.animation state must be a non-empty string when provided');
  }
}

function validateAudioClipComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set(['clipId', 'src', 'kind', 'volume', 'loop', 'trigger']);
  const allowedKinds = new Set(['sfx', 'music']);
  const allowedTriggers = new Set(['onDemoStart', 'onMove', 'onBlockedMove', 'manual']);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'audio.clip version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'audio.clip must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'audio.clip fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for audio.clip');
    }
  }

  if (typeof fields.clipId !== 'string' || fields.clipId.trim().length === 0) {
    pushMessage(errors, `${componentPath}.fields.clipId`, 'audio.clip clipId must be a non-empty string');
  }

  if (fields.src !== undefined && !isSafeRelativePath(fields.src)) {
    pushMessage(errors, `${componentPath}.fields.src`, 'audio.clip src must be a safe relative path when provided');
  }

  if (!allowedKinds.has(fields.kind)) {
    pushMessage(errors, `${componentPath}.fields.kind`, 'audio.clip kind must be `sfx` or `music`');
  }

  if (fields.volume !== undefined && (typeof fields.volume !== 'number' || fields.volume < 0 || fields.volume > 1)) {
    pushMessage(errors, `${componentPath}.fields.volume`, 'audio.clip volume must be a number between 0 and 1 when provided');
  }

  if (fields.loop !== undefined && typeof fields.loop !== 'boolean') {
    pushMessage(errors, `${componentPath}.fields.loop`, 'audio.clip loop must be a boolean when provided');
  }

  if (fields.trigger !== undefined && !allowedTriggers.has(fields.trigger)) {
    pushMessage(
      errors,
      `${componentPath}.fields.trigger`,
      'audio.clip trigger must be onDemoStart, onMove, onBlockedMove or manual when provided'
    );
  }
}

function validateUiScreenWidget(widget, widgetPath, errors, seenWidgetIds) {
  const allowedFieldNames = new Set(['id', 'kind', 'text', 'x', 'y', 'width', 'height', 'children']);
  const allowedKinds = new Set(['panel', 'label']);

  if (!isPlainObject(widget)) {
    pushMessage(errors, widgetPath, 'ui.screen widget must be an object');
    return;
  }

  for (const fieldName of Object.keys(widget)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${widgetPath}.${fieldName}`, 'is not allowed for ui.screen widget');
    }
  }

  if (typeof widget.id !== 'string' || widget.id.trim().length === 0) {
    pushMessage(errors, `${widgetPath}.id`, 'ui.screen widget id must be a non-empty string');
  } else if (seenWidgetIds.has(widget.id)) {
    pushMessage(errors, `${widgetPath}.id`, `duplicate ui.screen widget id: ${widget.id}`);
  } else {
    seenWidgetIds.add(widget.id);
  }

  if (!allowedKinds.has(widget.kind)) {
    pushMessage(errors, `${widgetPath}.kind`, 'ui.screen widget kind must be `panel` or `label`');
  }

  if (widget.kind === 'label') {
    if (typeof widget.text !== 'string' || widget.text.trim().length === 0) {
      pushMessage(errors, `${widgetPath}.text`, 'ui.screen label text must be a non-empty string');
    }
  } else if (widget.text !== undefined) {
    pushMessage(errors, `${widgetPath}.text`, 'ui.screen widget text is only allowed for `label` widgets');
  }

  for (const coordinateName of ['x', 'y']) {
    if (widget[coordinateName] !== undefined && !Number.isInteger(widget[coordinateName])) {
      pushMessage(errors, `${widgetPath}.${coordinateName}`, `ui.screen widget ${coordinateName} must be an integer when provided`);
    }
  }

  for (const dimensionName of ['width', 'height']) {
    if (widget[dimensionName] !== undefined && (!Number.isInteger(widget[dimensionName]) || widget[dimensionName] < 1)) {
      pushMessage(errors, `${widgetPath}.${dimensionName}`, `ui.screen widget ${dimensionName} must be an integer >= 1 when provided`);
    }
  }

  if (widget.children !== undefined) {
    if (!Array.isArray(widget.children)) {
      pushMessage(errors, `${widgetPath}.children`, 'ui.screen widget children must be an array when provided');
      return;
    }

    for (const [childIndex, child] of widget.children.entries()) {
      validateUiScreenWidget(child, `${widgetPath}.children[${childIndex}]`, errors, seenWidgetIds);
    }
  }
}

function collectUiScreenWidgetMetadata(widgets, widgetMetadata = new Map()) {
  for (const widget of widgets ?? []) {
    const children = Array.isArray(widget.children) ? widget.children : [];
    widgetMetadata.set(widget.id, {
      kind: widget.kind,
      isLeafLabel: widget.kind === 'label' && children.length === 0
    });
    collectUiScreenWidgetMetadata(children, widgetMetadata);
  }

  return widgetMetadata;
}

function validateUiScreenComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set(['screenId', 'active', 'layer', 'widgets']);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'ui.screen version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'ui.screen must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'ui.screen fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for ui.screen');
    }
  }

  if (typeof fields.screenId !== 'string' || fields.screenId.trim().length === 0) {
    pushMessage(errors, `${componentPath}.fields.screenId`, 'ui.screen screenId must be a non-empty string');
  }

  if (fields.active !== undefined && typeof fields.active !== 'boolean') {
    pushMessage(errors, `${componentPath}.fields.active`, 'ui.screen active must be a boolean when provided');
  }

  if (fields.layer !== undefined && !Number.isInteger(fields.layer)) {
    pushMessage(errors, `${componentPath}.fields.layer`, 'ui.screen layer must be an integer when provided');
  }

  if (!Array.isArray(fields.widgets) || fields.widgets.length === 0) {
    pushMessage(errors, `${componentPath}.fields.widgets`, 'ui.screen widgets must be a non-empty array');
    return;
  }

  const seenWidgetIds = new Set();
  for (const [widgetIndex, widget] of fields.widgets.entries()) {
    validateUiScreenWidget(widget, `${componentPath}.fields.widgets[${widgetIndex}]`, errors, seenWidgetIds);
  }
}

function validateUiActionSemanticsAction(action, actionPath, errors, seenWidgetIds, seenActionIds) {
  const allowedFieldNames = new Set(['widgetId', 'actionId']);

  if (!isPlainObject(action)) {
    pushMessage(errors, actionPath, 'ui.action.semantics action must be an object');
    return;
  }

  for (const fieldName of Object.keys(action)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${actionPath}.${fieldName}`, 'is not allowed for ui.action.semantics action');
    }
  }

  if (typeof action.widgetId !== 'string' || action.widgetId.trim().length === 0) {
    pushMessage(errors, `${actionPath}.widgetId`, 'ui.action.semantics action widgetId must be a non-empty string');
  } else if (seenWidgetIds.has(action.widgetId)) {
    pushMessage(errors, `${actionPath}.widgetId`, `duplicate ui.action.semantics widgetId: ${action.widgetId}`);
  } else {
    seenWidgetIds.add(action.widgetId);
  }

  if (typeof action.actionId !== 'string' || action.actionId.trim().length === 0) {
    pushMessage(errors, `${actionPath}.actionId`, 'ui.action.semantics actionId must be a non-empty string');
  } else if (seenActionIds.has(action.actionId)) {
    pushMessage(errors, `${actionPath}.actionId`, `duplicate ui.action.semantics actionId: ${action.actionId}`);
  } else {
    seenActionIds.add(action.actionId);
  }
}

function validateUiActionSemanticsComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set(['screenId', 'initialFocusWidgetId', 'actions']);

  if (component.version !== 1) {
    pushMessage(errors, `${componentPath}.version`, 'ui.action.semantics version must be exactly 1');
  }

  if (component.replicated !== false) {
    pushMessage(errors, `${componentPath}.replicated`, 'ui.action.semantics must not be replicated');
  }

  if (!isPlainObject(fields)) {
    pushMessage(errors, `${componentPath}.fields`, 'ui.action.semantics fields must be an object');
    return;
  }

  for (const fieldName of Object.keys(fields)) {
    if (!allowedFieldNames.has(fieldName)) {
      pushMessage(errors, `${componentPath}.fields.${fieldName}`, 'is not allowed for ui.action.semantics');
    }
  }

  if (typeof fields.screenId !== 'string' || fields.screenId.trim().length === 0) {
    pushMessage(errors, `${componentPath}.fields.screenId`, 'ui.action.semantics screenId must be a non-empty string');
  }

  if (
    fields.initialFocusWidgetId !== undefined &&
    (typeof fields.initialFocusWidgetId !== 'string' || fields.initialFocusWidgetId.trim().length === 0)
  ) {
    pushMessage(
      errors,
      `${componentPath}.fields.initialFocusWidgetId`,
      'ui.action.semantics initialFocusWidgetId must be a non-empty string when provided'
    );
  }

  if (!Array.isArray(fields.actions) || fields.actions.length === 0) {
    pushMessage(errors, `${componentPath}.fields.actions`, 'ui.action.semantics actions must be a non-empty array');
    return;
  }

  const seenWidgetIds = new Set();
  const seenActionIds = new Set();
  for (const [actionIndex, action] of fields.actions.entries()) {
    validateUiActionSemanticsAction(
      action,
      `${componentPath}.fields.actions[${actionIndex}]`,
      errors,
      seenWidgetIds,
      seenActionIds
    );
  }
}

function validateUiActionSemanticsOwnership(component, componentPath, uiScreenComponent, errors) {
  if (!uiScreenComponent) {
    pushMessage(errors, componentPath, 'ui.action.semantics must share an entity with ui.screen');
    return;
  }

  if (
    typeof component.fields?.screenId === 'string' &&
    typeof uiScreenComponent.fields?.screenId === 'string' &&
    component.fields.screenId !== uiScreenComponent.fields.screenId
  ) {
    pushMessage(
      errors,
      `${componentPath}.fields.screenId`,
      'ui.action.semantics screenId must match the co-located ui.screen screenId'
    );
  }

  if (!isPlainObject(component.fields) || !isPlainObject(uiScreenComponent.fields)) {
    return;
  }

  if (!Array.isArray(component.fields.actions) || !Array.isArray(uiScreenComponent.fields.widgets)) {
    return;
  }

  const widgetMetadata = collectUiScreenWidgetMetadata(uiScreenComponent.fields.widgets);
  const actionWidgetIds = new Set(
    component.fields.actions
      .map((action) => action?.widgetId)
      .filter((widgetId) => typeof widgetId === 'string' && widgetId.trim().length > 0)
  );

  for (const [actionIndex, action] of component.fields.actions.entries()) {
    if (!isPlainObject(action) || typeof action.widgetId !== 'string' || action.widgetId.trim().length === 0) {
      continue;
    }

    const widget = widgetMetadata.get(action.widgetId);
    if (!widget) {
      pushMessage(
        errors,
        `${componentPath}.fields.actions[${actionIndex}].widgetId`,
        'ui.action.semantics action widgetId must reference a widget on the co-located ui.screen'
      );
      continue;
    }

    if (!widget.isLeafLabel) {
      pushMessage(
        errors,
        `${componentPath}.fields.actions[${actionIndex}].widgetId`,
        'ui.action.semantics action widgetId must reference a leaf label widget'
      );
    }
  }

  if (
    typeof component.fields.initialFocusWidgetId === 'string' &&
    !actionWidgetIds.has(component.fields.initialFocusWidgetId)
  ) {
    pushMessage(
      errors,
      `${componentPath}.fields.initialFocusWidgetId`,
      'ui.action.semantics initialFocusWidgetId must reference a widgetId declared in actions'
    );
  }
}

export function validateSceneInvariants(scene) {
  const errors = [];
  const warnings = [];

  const entityIds = new Set();
  const entityNames = new Set();
  let hasReplicatedComponent = false;
  const cameraViewportOwners = [];
  const uiScreenIds = new Map();
  const uiActionSemanticsOwners = [];

  for (const [entityIndex, entity] of scene.entities.entries()) {
    const entityPath = `$.entities[${entityIndex}]`;

    if (entityIds.has(entity.id)) {
      pushMessage(errors, `${entityPath}.id`, `duplicate entity id: ${entity.id}`);
    } else {
      entityIds.add(entity.id);
    }

    if (entity.name) {
      if (entityNames.has(entity.name)) {
        pushMessage(warnings, `${entityPath}.name`, `duplicate entity name: ${entity.name}`);
      } else {
        entityNames.add(entity.name);
      }
    } else {
      pushMessage(warnings, `${entityPath}.name`, 'entity has no human-readable name');
    }

    if (hasSafePrefabReference(entity) && !isSafeRelativePath(entity.prefab)) {
      pushMessage(errors, `${entityPath}.prefab`, 'prefab must be a safe relative path');
    } else if (hasSafePrefabReference(entity) && !isPrefabDocumentPath(entity.prefab)) {
      pushMessage(errors, `${entityPath}.prefab`, 'prefab must reference a .prefab.json file');
    }

    if (entity.components === undefined) {
      if (!hasSafePrefabReference(entity)) {
        pushMessage(errors, `${entityPath}.components`, 'entity must contain at least one component');
        continue;
      }
    } else if (!Array.isArray(entity.components) || (entity.components.length === 0 && !hasSafePrefabReference(entity))) {
      pushMessage(errors, `${entityPath}.components`, 'entity must contain at least one component');
      continue;
    }

    const componentKinds = new Set();
    const uiScreenComponent = (entity.components ?? []).find((component) => component?.kind === 'ui.screen') ?? null;

    for (const [componentIndex, component] of (entity.components ?? []).entries()) {
      const componentPath = `${entityPath}.components[${componentIndex}]`;

      if (componentKinds.has(component.kind)) {
        pushMessage(errors, `${componentPath}.kind`, `duplicate component kind in entity: ${component.kind}`);
      } else {
        componentKinds.add(component.kind);
      }

      if (component.replicated) {
        hasReplicatedComponent = true;
      }

      if (component.kind === 'visual.sprite') {
        validateVisualSpriteComponent(component, componentPath, errors);
      }

      if (component.kind === 'tile.layer') {
        validateTileLayerComponent(component, componentPath, errors);
      }

      if (component.kind === 'camera.viewport') {
        cameraViewportOwners.push({
          entityId: entity.id,
          componentPath
        });
        validateCameraViewportComponent(component, componentPath, errors);
      }

      if (component.kind === 'collision.bounds') {
        validateCollisionBoundsComponent(component, componentPath, errors);
      }

      if (component.kind === 'ui.screen') {
        if (typeof component.fields?.screenId === 'string' && component.fields.screenId.trim().length > 0) {
          if (!uiScreenIds.has(component.fields.screenId)) {
            uiScreenIds.set(component.fields.screenId, []);
          }
          uiScreenIds.get(component.fields.screenId).push({
            componentPath,
            entityId: entity.id
          });
        }

        validateUiScreenComponent(component, componentPath, errors);
      }

      if (component.kind === 'ui.action.semantics') {
        uiActionSemanticsOwners.push({
          component,
          componentPath,
          uiScreenComponent
        });
        validateUiActionSemanticsComponent(component, componentPath, errors);
      }

      if (component.kind === 'visual.sprite.animation') {
        validateSpriteAnimationComponent(component, componentPath, errors);
      }

      if (component.kind === 'audio.clip') {
        validateAudioClipComponent(component, componentPath, errors);
      }
    }

  }

  for (const owner of uiActionSemanticsOwners) {
    validateUiActionSemanticsOwnership(
      owner.component,
      owner.componentPath,
      owner.uiScreenComponent,
      errors
    );
  }

  if (cameraViewportOwners.length > 1) {
    for (const owner of cameraViewportOwners) {
      pushMessage(
        errors,
        owner.componentPath,
        `camera.viewport must be unique per scene; found multiple on entities: ${cameraViewportOwners
          .map((entry) => entry.entityId)
          .join(', ')}`
      );
    }
  }

  for (const [screenId, owners] of uiScreenIds.entries()) {
    if (owners.length < 2) {
      continue;
    }

    const message =
      `ui.screen screenId must be unique per scene; found multiple owners for \`${screenId}\`: ` +
      owners.map((owner) => owner.entityId).join(', ');
    for (const owner of owners) {
      pushMessage(errors, `${owner.componentPath}.fields.screenId`, message);
    }
  }

  const systems = Array.isArray(scene.systems) ? scene.systems : [];
  if (hasReplicatedComponent && !systems.includes('networking.replication')) {
    pushMessage(
      errors,
      '$.systems',
      'scene has replicated components but is missing system "networking.replication"'
    );
  }

  const assetRefs = Array.isArray(scene.assetRefs) ? scene.assetRefs : [];
  const seenAssetRefs = new Set();
  for (const [index, assetRef] of assetRefs.entries()) {
    const assetPath = `$.assetRefs[${index}]`;
    if (seenAssetRefs.has(assetRef)) {
      pushMessage(warnings, assetPath, `duplicate asset reference: ${assetRef}`);
    } else {
      seenAssetRefs.add(assetRef);
    }
  }

  return { errors, warnings };
}
