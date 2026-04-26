import { loadSceneFile } from '../scene/load-scene.mjs';
import { loadValidatedAssetManifestV1 } from '../assets/load-validated-asset-manifest-v1.mjs';
import { validateAssetManifestV1 } from '../assets/validate-asset-manifest-v1.mjs';

const DEFAULT_VIEWPORT = Object.freeze({ width: 320, height: 180 });
const DEFAULT_DRAW_SIZE = 16;
const LEGACY_SPRITE_COMPONENT_KIND = 'sprite';
const VISUAL_SPRITE_COMPONENT_KIND = 'visual.sprite';
const TILE_LAYER_COMPONENT_KIND = 'tile.layer';

function assertIntegerOption(name, value, minimum) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`buildRenderSnapshotV1: \`${name}\` must be an integer >= ${minimum}`);
  }
}

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function getSpriteComponent(entity) {
  return getComponent(entity, VISUAL_SPRITE_COMPONENT_KIND)
    ?? getComponent(entity, LEGACY_SPRITE_COMPONENT_KIND);
}

function getTileLayerComponent(entity) {
  return getComponent(entity, TILE_LAYER_COMPONENT_KIND);
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
  const sprite = getSpriteComponent(entity);
  const fields = sprite?.fields ?? {};
  const width = toInteger(fields.width, DEFAULT_DRAW_SIZE);
  const height = toInteger(fields.height, DEFAULT_DRAW_SIZE);

  return {
    width: width >= 1 ? width : DEFAULT_DRAW_SIZE,
    height: height >= 1 ? height : DEFAULT_DRAW_SIZE
  };
}

function resolveDrawSizeWithAssetFallback(entity, asset) {
  const sprite = getSpriteComponent(entity);
  const fields = sprite?.fields ?? {};
  const width = toInteger(fields.width, toInteger(asset?.width, DEFAULT_DRAW_SIZE));
  const height = toInteger(fields.height, toInteger(asset?.height, DEFAULT_DRAW_SIZE));

  return {
    width: width >= 1 ? width : DEFAULT_DRAW_SIZE,
    height: height >= 1 ? height : DEFAULT_DRAW_SIZE
  };
}

function resolveLayer(entity) {
  const sprite = getSpriteComponent(entity);
  return toInteger(sprite?.fields?.layer, 0);
}

function resolveSpriteAssetId(entity, assetManifestProvided) {
  if (!assetManifestProvided) {
    return undefined;
  }

  const sprite = getSpriteComponent(entity);
  const assetId = sprite?.fields?.assetId;
  if (assetId === undefined) {
    return undefined;
  }

  if (typeof assetId !== 'string' || assetId.trim().length === 0) {
    throw new Error(`buildRenderSnapshotV1: entity \`${entity.id}\` ${sprite.kind}.assetId must be a non-empty string`);
  }

  return assetId.trim();
}

function toRectDrawCall(entity, position, size) {
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

function toSpriteDrawCall(entity, position, size, assetId) {
  return {
    kind: 'sprite',
    id: entity.id,
    assetId,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    layer: resolveLayer(entity)
  };
}

function toTileLayerDrawCalls(entity) {
  const tileLayer = getTileLayerComponent(entity);
  if (!tileLayer) {
    return [];
  }

  const fields = tileLayer.fields ?? {};
  const tileWidth = toInteger(fields.tileWidth, DEFAULT_DRAW_SIZE);
  const tileHeight = toInteger(fields.tileHeight, DEFAULT_DRAW_SIZE);
  const layer = toInteger(fields.layer, 0);
  const tiles = Array.isArray(fields.tiles) ? fields.tiles : [];
  const palette = fields.palette && typeof fields.palette === 'object' ? fields.palette : {};
  const drawCalls = [];

  for (const [rowIndex, row] of tiles.entries()) {
    if (!Array.isArray(row)) {
      continue;
    }

    for (const [columnIndex, tileId] of row.entries()) {
      const paletteId = String(tileId);
      const paletteEntry = palette[paletteId];
      if (!paletteEntry || paletteEntry.kind === 'empty') {
        continue;
      }

      if (paletteEntry.kind !== 'rect') {
        continue;
      }

      const width = toInteger(paletteEntry.width, tileWidth);
      const height = toInteger(paletteEntry.height, tileHeight);
      drawCalls.push({
        kind: 'rect',
        id: `${entity.id}.tile.${rowIndex}.${columnIndex}`,
        x: columnIndex * tileWidth,
        y: rowIndex * tileHeight,
        width: width >= 1 ? width : tileWidth,
        height: height >= 1 ? height : tileHeight,
        layer
      });
    }
  }

  return drawCalls;
}

function toDrawCall(entity, assetsById = undefined) {
  const transform = getComponent(entity, 'transform');
  if (!transform) {
    return undefined;
  }

  const position = resolveTransformPosition(transform);
  const assetId = resolveSpriteAssetId(entity, assetsById !== undefined);
  if (assetId === undefined) {
    return toRectDrawCall(entity, position, resolveDrawSize(entity));
  }

  const asset = assetsById.get(assetId);
  if (!asset) {
    throw new Error(`buildRenderSnapshotV1: entity \`${entity.id}\` references unknown assetId \`${assetId}\``);
  }

  return {
    ...toSpriteDrawCall(entity, position, resolveDrawSizeWithAssetFallback(entity, asset), assetId),
    assetSrc: asset.src
  };
}

function toEntityDrawCalls(entity, assetsById = undefined) {
  const drawCalls = toTileLayerDrawCalls(entity);
  const entityDrawCall = toDrawCall(entity, assetsById);
  if (entityDrawCall) {
    drawCalls.push(entityDrawCall);
  }
  return drawCalls;
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

function formatAssetManifestErrors(report) {
  return report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
}

async function resolveAssetManifest(options) {
  if (options.assetManifest !== undefined && options.assetManifestPath !== undefined) {
    throw new Error('buildRenderSnapshotV1: provide only one of `assetManifest` or `assetManifestPath`');
  }

  if (options.assetManifestPath !== undefined) {
    return loadValidatedAssetManifestV1(options.assetManifestPath);
  }

  if (options.assetManifest !== undefined) {
    const report = await validateAssetManifestV1(options.assetManifest);
    if (!report.ok) {
      throw new Error(`buildRenderSnapshotV1: asset manifest is invalid: ${formatAssetManifestErrors(report)}`);
    }

    return report.assetManifest;
  }

  return undefined;
}

export async function buildRenderSnapshotV1(sceneOrPath, options = {}) {
  const tick = options.tick ?? 0;
  const width = options.width ?? DEFAULT_VIEWPORT.width;
  const height = options.height ?? DEFAULT_VIEWPORT.height;

  assertIntegerOption('tick', tick, 0);
  assertIntegerOption('width', width, 1);
  assertIntegerOption('height', height, 1);

  const scene = await resolveScene(sceneOrPath);
  const assetManifest = await resolveAssetManifest(options);
  const assetsById = assetManifest === undefined
    ? undefined
    : new Map(assetManifest.assets.map((asset) => [asset.id, asset]));
  const drawCalls = (scene.entities ?? [])
    .flatMap((entity) => toEntityDrawCalls(entity, assetsById))
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
