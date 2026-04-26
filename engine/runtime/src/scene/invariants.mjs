function pushMessage(collection, path, message) {
  collection.push({ path, message });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

export function validateSceneInvariants(scene) {
  const errors = [];
  const warnings = [];

  const entityIds = new Set();
  const entityNames = new Set();
  let hasReplicatedComponent = false;

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
