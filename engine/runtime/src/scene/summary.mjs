export function summarizeScene(scene) {
  const entityCount = Array.isArray(scene.entities) ? scene.entities.length : 0;
  const systems = Array.isArray(scene.systems) ? scene.systems : [];
  const assetRefs = Array.isArray(scene.assetRefs) ? scene.assetRefs : [];

  let componentCount = 0;
  let replicatedComponentCount = 0;

  for (const entity of scene.entities ?? []) {
    for (const component of entity.components ?? []) {
      componentCount += 1;
      if (component.replicated) {
        replicatedComponentCount += 1;
      }
    }
  }

  return {
    name: scene.metadata?.name ?? 'unknown',
    entityCount,
    componentCount,
    replicatedComponentCount,
    systemCount: systems.length,
    assetRefCount: assetRefs.length,
    systems,
    assetRefs
  };
}
