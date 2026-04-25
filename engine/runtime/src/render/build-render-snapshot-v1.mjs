import { loadSceneFile } from '../scene/load-scene.mjs';

const DEFAULT_VIEWPORT = Object.freeze({ width: 320, height: 180 });
const DEFAULT_DRAW_SIZE = 16;

function assertIntegerOption(name, value, minimum) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`buildRenderSnapshotV1: \`${name}\` must be an integer >= ${minimum}`);
  }
}

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function toInteger(value, fallback) {
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function resolveTransformPosition(transform) {
  const fields = transform?.fields ?? {};
  const position = fields.position && typeof fields.position === 'object'
    ? fields.position
    : fields;

  return {
    x: toInteger(position.x, 0),
    y: toInteger(position.y, 0)
  };
}

function resolveDrawSize(entity) {
  const sprite = getComponent(entity, 'sprite');
  const fields = sprite?.fields ?? {};
  const width = toInteger(fields.width, DEFAULT_DRAW_SIZE);
  const height = toInteger(fields.height, DEFAULT_DRAW_SIZE);

  return {
    width: width >= 1 ? width : DEFAULT_DRAW_SIZE,
    height: height >= 1 ? height : DEFAULT_DRAW_SIZE
  };
}

function resolveLayer(entity) {
  const sprite = getComponent(entity, 'sprite');
  return toInteger(sprite?.fields?.layer, 0);
}

function toDrawCall(entity) {
  const transform = getComponent(entity, 'transform');
  if (!transform) {
    return undefined;
  }

  const position = resolveTransformPosition(transform);
  const size = resolveDrawSize(entity);

  return {
    kind: 'rect',
    id: entity.id,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    layer: resolveLayer(entity)
  };
}

function sortDrawCalls(left, right) {
  if (left.layer !== right.layer) {
    return left.layer - right.layer;
  }

  return left.id.localeCompare(right.id);
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    return loadSceneFile(sceneOrPath);
  }

  if (!sceneOrPath || typeof sceneOrPath !== 'object') {
    throw new Error('buildRenderSnapshotV1: `sceneOrPath` must be a scene object or path string');
  }

  return sceneOrPath;
}

export async function buildRenderSnapshotV1(sceneOrPath, options = {}) {
  const tick = options.tick ?? 0;
  const width = options.width ?? DEFAULT_VIEWPORT.width;
  const height = options.height ?? DEFAULT_VIEWPORT.height;

  assertIntegerOption('tick', tick, 0);
  assertIntegerOption('width', width, 1);
  assertIntegerOption('height', height, 1);

  const scene = await resolveScene(sceneOrPath);
  const drawCalls = (scene.entities ?? [])
    .map(toDrawCall)
    .filter(Boolean)
    .sort(sortDrawCalls);

  return {
    renderSnapshotVersion: 1,
    scene: scene.metadata.name,
    tick,
    viewport: {
      width,
      height
    },
    drawCalls
  };
}
