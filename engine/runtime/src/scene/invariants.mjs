function pushMessage(collection, path, message) {
  collection.push({ path, message });
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
      if (typeof entity.prefab === 'string' && entity.prefab.length > 0) {
        pushMessage(warnings, `${entityPath}.components`, 'entity has no local components; expecting prefab resolution at load time');
      } else {
        pushMessage(errors, `${entityPath}.components`, 'entity must contain at least one component');
      }
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
