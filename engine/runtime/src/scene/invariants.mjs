function pushMessage(collection, path, message) {
  collection.push({ path, message });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidTileId(value) {
  return Number.isInteger(value) || (typeof value === 'string' && value.trim().length > 0);
}

function validateVisualSpriteComponent(component, componentPath, errors) {
  const fields = component.fields;
  const allowedFieldNames = new Set(['assetId', 'width', 'height', 'layer']);

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
    const allowedFieldNames = new Set(['kind', 'width', 'height']);
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

export function validateSceneInvariants(scene) {
  const errors = [];
  const warnings = [];

  const entityIds = new Set();
  const entityNames = new Set();
  let hasReplicatedComponent = false;
  const cameraViewportOwners = [];

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

    if (!Array.isArray(entity.components) || entity.components.length === 0) {
      pushMessage(errors, `${entityPath}.components`, 'entity must contain at least one component');
      continue;
    }

    const componentKinds = new Set();

    for (const [componentIndex, component] of entity.components.entries()) {
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
    }

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
