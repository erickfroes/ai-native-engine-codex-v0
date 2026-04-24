import { loadSceneFile } from '../scene/load-scene.mjs';

function createNode(path, segment) {
  return {
    path,
    segment,
    children: [],
    entity: null
  };
}

function indexNode(parent, node) {
  parent.children.push(node);
  parent.children.sort((a, b) => a.path.localeCompare(b.path));
}

export function buildSceneHierarchy(scene) {
  return buildSceneHierarchyWithOptions(scene);
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

export function buildSceneHierarchyWithOptions(scene, options = {}) {
  const componentKindFilter = toComponentKindFilter(options);
  const systemNameFilter = toSystemNameFilter(options);
  const root = createNode('', 'root');
  const nodeByPath = new Map([[root.path, root]]);
  let includedEntityCount = 0;

  if (systemNameFilter && !(scene.systems ?? []).includes(systemNameFilter)) {
    return {
      sceneName: scene.metadata?.name ?? 'unknown',
      componentKindFilter,
      systemNameFilter,
      entityCount: 0,
      nodeCount: 0,
      leafCount: 0,
      roots: []
    };
  }

  for (const entity of scene.entities ?? []) {
    const componentKinds = (entity.components ?? []).map((component) => component.kind);
    if (componentKindFilter && !componentKinds.includes(componentKindFilter)) {
      continue;
    }

    const segments = String(entity.id).split('.').filter(Boolean);
    let currentPath = '';
    let parentNode = root;

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}.${segment}` : segment;
      let node = nodeByPath.get(currentPath);
      if (!node) {
        node = createNode(currentPath, segment);
        nodeByPath.set(currentPath, node);
        indexNode(parentNode, node);
      }
      parentNode = node;
    }

    parentNode.entity = {
      id: entity.id,
      name: entity.name ?? null,
      prefab: entity.prefab ?? null,
      componentKinds: componentKindFilter
        ? componentKinds.filter((kind) => kind === componentKindFilter)
        : componentKinds
    };
    includedEntityCount += 1;
  }

  const roots = root.children;
  const nodeCount = nodeByPath.size - 1;
  const leafCount = [...nodeByPath.values()].filter((node) => node.path && node.entity).length;

  return {
    sceneName: scene.metadata?.name ?? 'unknown',
    componentKindFilter,
    systemNameFilter,
    entityCount: includedEntityCount,
    nodeCount,
    leafCount,
    roots
  };
}

export async function inspectSceneHierarchyFile(scenePath, options = {}) {
  const scene = await loadSceneFile(scenePath);
  return buildSceneHierarchyWithOptions(scene, options);
}

function renderNodeLines(node, depth, lines) {
  const indent = '  '.repeat(depth);
  const suffix = node.entity
    ? ` [entity=${node.entity.id}; components=${node.entity.componentKinds.join(',') || 'none'}]`
    : '';
  lines.push(`${indent}- ${node.segment}${suffix}`);

  for (const child of node.children) {
    renderNodeLines(child, depth + 1, lines);
  }
}

export function formatSceneHierarchyReport(report) {
  const lines = [];
  lines.push(`Scene: ${report.sceneName}`);
  if (report.componentKindFilter) {
    lines.push(`Component filter: ${report.componentKindFilter}`);
  }
  if (report.systemNameFilter) {
    lines.push(`System filter: ${report.systemNameFilter}`);
  }
  lines.push(`Entities: ${report.entityCount}`);
  lines.push(`Hierarchy nodes: ${report.nodeCount}`);
  lines.push(`Hierarchy leaves: ${report.leafCount}`);
  lines.push('');
  lines.push('Hierarchy:');

  for (const root of report.roots) {
    renderNodeLines(root, 0, lines);
  }

  return lines.join('\n');
}
