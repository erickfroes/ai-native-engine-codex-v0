import { loadSceneFile } from '../scene/load-scene.mjs';

export function createWorldFromScene(scene) {
  const entities = (scene.entities ?? []).map((entity) => ({
    id: entity.id,
    name: entity.name ?? null,
    components: (entity.components ?? []).map((component) => ({
      kind: component.kind,
      version: component.version,
      replicated: component.replicated,
      fields: component.fields
    }))
  }));

  return {
    sceneName: scene.metadata?.name ?? 'unknown',
    systems: [...(scene.systems ?? [])],
    entities
  };
}

export async function loadWorldFromSceneFile(scenePath) {
  const scene = await loadSceneFile(scenePath);
  return createWorldFromScene(scene);
}

function toComponentKindFilter(options = {}) {
  return typeof options.componentKind === 'string' && options.componentKind.trim().length > 0
    ? options.componentKind.trim()
    : null;
}

function toSystemNameFilter(options = {}) {
  return typeof options.systemName === 'string' && options.systemName.trim().length > 0
    ? options.systemName.trim()
    : null;
}

export function summarizeWorld(world, options = {}) {
  const componentKindFilter = toComponentKindFilter(options);
  const systemNameFilter = toSystemNameFilter(options);
  const componentKinds = new Set();
  let componentCount = 0;
  const entities = [];

  if (systemNameFilter && !(world.systems ?? []).includes(systemNameFilter)) {
    return {
      sceneName: world.sceneName,
      componentKindFilter,
      systemNameFilter,
      entityCount: 0,
      componentCount: 0,
      componentKinds: [],
      entities
    };
  }

  for (const entity of world.entities) {
    const components = componentKindFilter
      ? entity.components.filter((component) => component.kind === componentKindFilter)
      : entity.components;

    if (componentKindFilter && components.length === 0) {
      continue;
    }

    for (const component of components) {
      componentCount += 1;
      componentKinds.add(component.kind);
    }

    entities.push({
      id: entity.id,
      name: entity.name,
      components: components.map((component) => component.kind)
    });
  }

  return {
    sceneName: world.sceneName,
    componentKindFilter,
    systemNameFilter,
    entityCount: entities.length,
    componentCount,
    componentKinds: [...componentKinds].sort(),
    entities
  };
}

export function formatWorldSummary(summary) {
  const lines = [];
  lines.push(`Scene: ${summary.sceneName}`);
  if (summary.componentKindFilter) {
    lines.push(`Component filter: ${summary.componentKindFilter}`);
  }
  if (summary.systemNameFilter) {
    lines.push(`System filter: ${summary.systemNameFilter}`);
  }
  lines.push(`Entities: ${summary.entityCount}`);
  lines.push(`Components: ${summary.componentCount}`);
  lines.push(`Component kinds: ${summary.componentKinds.join(', ') || '(none)'}`);
  lines.push('');
  lines.push('Entities:');
  for (const entity of summary.entities) {
    lines.push(`- ${entity.id} (${entity.name ?? 'unnamed'}): ${entity.components.join(', ')}`);
  }
  return lines.join('\n');
}
