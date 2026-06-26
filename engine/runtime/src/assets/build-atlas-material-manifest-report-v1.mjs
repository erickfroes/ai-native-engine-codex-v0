import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { buildAssetManifestValidationReportV1 } from './build-asset-manifest-validation-report-v1.mjs';

export const ATLAS_MATERIAL_MANIFEST_VERSION = 1;
export const ATLAS_MATERIAL_MANIFEST_REPORT_VERSION = 1;

const TOP_LEVEL_KEYS = new Set([
  'atlasMaterialManifestVersion',
  'metadata',
  'assetManifestPath',
  'atlases',
  'materials',
  'sprites',
  'tiles'
]);
const METADATA_KEYS = new Set(['name']);
const ATLAS_KEYS = new Set(['id', 'assetId', 'regions']);
const REGION_KEYS = new Set(['id', 'x', 'y', 'width', 'height']);
const MATERIAL_KEYS = new Set(['id', 'kind', 'sampler', 'alphaMode']);
const BINDING_KEYS = new Set(['id', 'atlasId', 'regionId', 'materialId']);
const MATERIAL_KINDS = new Set(['sprite', 'tile', 'ui']);
const SAMPLERS = new Set(['nearest', 'linear']);
const ALPHA_MODES = new Set(['opaque', 'blend', 'mask']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushMessage(collection, errorPath, message) {
  collection.push({ path: errorPath, message });
}

function createRootMessage(target, ref, message) {
  return {
    target,
    ref,
    path: message.path,
    message: message.message
  };
}

function compareNullableString(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareReportMessages(left, right) {
  return (
    left.target.localeCompare(right.target) ||
    compareNullableString(left.ref, right.ref) ||
    left.path.localeCompare(right.path) ||
    left.message.localeCompare(right.message)
  );
}

function compareByKeys(...keys) {
  return (left, right) => {
    for (const key of keys) {
      const compared = compareNullableString(left[key], right[key]);
      if (compared !== 0) {
        return compared;
      }
    }

    return 0;
  };
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`buildAtlasMaterialManifestReportV1: \`${label}\` must be a non-empty string`);
  }
}

function validateUnknownKeys(value, allowedKeys, valuePath, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      pushMessage(errors, `${valuePath}.${key}`, 'is not allowed by atlas/material manifest v1');
    }
  }
}

function isSafeRelativeManifestPath(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();
  return (
    !trimmed.includes('://') &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('\\') &&
    !/^[A-Za-z]:[\\/]/.test(trimmed) &&
    !trimmed.split(/[\\/]+/).includes('..') &&
    !trimmed.includes('*') &&
    !trimmed.includes('?')
  );
}

function normalizeManifestPath(value) {
  return path.posix.normalize(value.trim().replaceAll('\\', '/'));
}

function resolveContainedPath(baseDir, relativePath) {
  const resolvedBaseDir = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBaseDir, relativePath);
  const relativeToBase = path.relative(resolvedBaseDir, resolvedPath);

  if (relativeToBase === '' || (!relativeToBase.startsWith('..') && !path.isAbsolute(relativeToBase))) {
    return resolvedPath;
  }

  throw new Error('must stay inside the manifest directory');
}

function readId(value, valuePath, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushMessage(errors, valuePath, 'must be a non-empty string');
    return null;
  }

  if (value.includes('#')) {
    pushMessage(errors, valuePath, 'must not contain #');
  }

  return value;
}

function readNonEmptyString(value, valuePath, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushMessage(errors, valuePath, 'must be a non-empty string');
    return null;
  }

  return value;
}

function readInteger(value, valuePath, minimum, errors) {
  if (!Number.isInteger(value) || value < minimum) {
    pushMessage(errors, valuePath, `must be an integer >= ${minimum}`);
    return null;
  }

  return value;
}

function validateManifestShape(manifest) {
  const errors = [];

  if (!isPlainObject(manifest)) {
    pushMessage(errors, '$', 'atlas/material manifest must be an object');
    return errors;
  }

  validateUnknownKeys(manifest, TOP_LEVEL_KEYS, '$', errors);

  if (manifest.atlasMaterialManifestVersion !== ATLAS_MATERIAL_MANIFEST_VERSION) {
    pushMessage(errors, '$.atlasMaterialManifestVersion', 'must be 1');
  }

  if (!isPlainObject(manifest.metadata)) {
    pushMessage(errors, '$.metadata', 'metadata must be an object');
  } else {
    validateUnknownKeys(manifest.metadata, METADATA_KEYS, '$.metadata', errors);
    if (typeof manifest.metadata.name !== 'string' || manifest.metadata.name.trim().length === 0) {
      pushMessage(errors, '$.metadata.name', 'must be a non-empty string');
    }
  }

  for (const key of ['atlases', 'materials', 'sprites', 'tiles']) {
    if (!Array.isArray(manifest[key])) {
      pushMessage(errors, `$.${key}`, 'must be an array');
    }
  }

  if (Array.isArray(manifest.atlases) && manifest.atlases.length === 0) {
    pushMessage(errors, '$.atlases', 'must contain at least one atlas');
  }

  if (Array.isArray(manifest.materials) && manifest.materials.length === 0) {
    pushMessage(errors, '$.materials', 'must contain at least one material');
  }

  return errors;
}

async function inspectAssetManifest(manifest, manifestDir) {
  const errors = [];
  let assetManifestPath = null;
  let assetManifestAbsolutePath = null;
  let assetManifestReport = null;

  if (!isPlainObject(manifest)) {
    return { assetManifestPath, assetManifestAbsolutePath, assetManifestReport, errors };
  }

  if (!isSafeRelativeManifestPath(manifest.assetManifestPath)) {
    pushMessage(errors, '$.assetManifestPath', 'must be a safe relative path');
    return { assetManifestPath, assetManifestAbsolutePath, assetManifestReport, errors };
  }

  assetManifestPath = normalizeManifestPath(manifest.assetManifestPath);
  if (!assetManifestPath.endsWith('.asset-manifest.json')) {
    pushMessage(errors, '$.assetManifestPath', 'must end with .asset-manifest.json');
    return { assetManifestPath, assetManifestAbsolutePath, assetManifestReport, errors };
  }

  try {
    assetManifestAbsolutePath = resolveContainedPath(manifestDir, assetManifestPath);
  } catch (error) {
    pushMessage(errors, '$.assetManifestPath', error.message);
    return { assetManifestPath, assetManifestAbsolutePath, assetManifestReport, errors };
  }

  assetManifestReport = await buildAssetManifestValidationReportV1(assetManifestAbsolutePath);
  if (!assetManifestReport.ok) {
    const firstError = assetManifestReport.errors[0];
    const message = firstError?.message === 'asset manifest file was not found'
      ? 'referenced asset manifest file was not found'
      : firstError?.message === 'asset manifest JSON is malformed'
        ? 'referenced asset manifest JSON is malformed'
        : 'referenced asset manifest is invalid';
    pushMessage(errors, '$.assetManifestPath', message);
  }

  return { assetManifestPath, assetManifestAbsolutePath, assetManifestReport, errors };
}

function createAssetLookup(assetManifestReport) {
  const assets = assetManifestReport?.ok === true && Array.isArray(assetManifestReport.assetManifest?.assets)
    ? assetManifestReport.assetManifest.assets
    : [];
  return new Map(assets.map((asset) => [asset.id, asset]));
}

function validateRegion(region, regionPath, atlas, seenRegionIds, asset) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(region)) {
    pushMessage(errors, regionPath, 'region must be an object');
    return {
      atlasId: atlas.id,
      id: null,
      assetId: atlas.assetId,
      x: null,
      y: null,
      width: null,
      height: null,
      ok: false,
      errors,
      warnings
    };
  }

  validateUnknownKeys(region, REGION_KEYS, regionPath, errors);

  const id = readId(region.id, `${regionPath}.id`, errors);
  if (id !== null) {
    if (seenRegionIds.has(id)) {
      pushMessage(errors, `${regionPath}.id`, `duplicate region id in atlas ${atlas.id ?? '(invalid)'}: ${id}`);
    } else {
      seenRegionIds.add(id);
    }
  }

  const x = readInteger(region.x, `${regionPath}.x`, 0, errors);
  const y = readInteger(region.y, `${regionPath}.y`, 0, errors);
  const width = readInteger(region.width, `${regionPath}.width`, 1, errors);
  const height = readInteger(region.height, `${regionPath}.height`, 1, errors);

  if (
    asset &&
    x !== null &&
    y !== null &&
    width !== null &&
    height !== null &&
    (x + width > asset.width || y + height > asset.height)
  ) {
    pushMessage(errors, regionPath, 'region must stay inside atlas asset bounds');
  }

  return {
    atlasId: atlas.id,
    id,
    assetId: atlas.assetId,
    x,
    y,
    width,
    height,
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function validateAtlas(atlas, index, assetLookup, seenAtlasIds) {
  const atlasPath = `$.atlases[${index}]`;
  const errors = [];
  const warnings = [];

  if (!isPlainObject(atlas)) {
    pushMessage(errors, atlasPath, 'atlas must be an object');
    return {
      atlas: {
        id: null,
        assetId: null,
        assetFound: false,
        assetWidth: null,
        assetHeight: null,
        regionCount: 0,
        ok: false,
        errors,
        warnings
      },
      regions: []
    };
  }

  validateUnknownKeys(atlas, ATLAS_KEYS, atlasPath, errors);

  const id = readId(atlas.id, `${atlasPath}.id`, errors);
  if (id !== null) {
    if (seenAtlasIds.has(id)) {
      pushMessage(errors, `${atlasPath}.id`, `duplicate atlas id: ${id}`);
    } else {
      seenAtlasIds.add(id);
    }
  }

  const assetId = readId(atlas.assetId, `${atlasPath}.assetId`, errors);
  const asset = assetId === null ? undefined : assetLookup.get(assetId);
  if (assetId !== null && assetLookup.size > 0 && !asset) {
    pushMessage(errors, `${atlasPath}.assetId`, `referenced assetId not found in asset manifest: ${assetId}`);
  }

  if (!Array.isArray(atlas.regions) || atlas.regions.length === 0) {
    pushMessage(errors, `${atlasPath}.regions`, 'must contain at least one region');
  }

  const seenRegionIds = new Set();
  const regions = Array.isArray(atlas.regions)
    ? atlas.regions.map((region, regionIndex) =>
        validateRegion(region, `${atlasPath}.regions[${regionIndex}]`, { id, assetId }, seenRegionIds, asset)
      )
    : [];

  return {
    atlas: {
      id,
      assetId,
      assetFound: asset !== undefined,
      assetWidth: asset?.width ?? null,
      assetHeight: asset?.height ?? null,
      regionCount: regions.length,
      ok: errors.length === 0 && regions.every((region) => region.ok),
      errors,
      warnings
    },
    regions
  };
}

function validateMaterial(material, index, seenMaterialIds) {
  const materialPath = `$.materials[${index}]`;
  const errors = [];
  const warnings = [];

  if (!isPlainObject(material)) {
    pushMessage(errors, materialPath, 'material must be an object');
    return {
      id: null,
      kind: null,
      sampler: null,
      alphaMode: null,
      ok: false,
      errors,
      warnings
    };
  }

  validateUnknownKeys(material, MATERIAL_KEYS, materialPath, errors);

  const id = readId(material.id, `${materialPath}.id`, errors);
  if (id !== null) {
    if (seenMaterialIds.has(id)) {
      pushMessage(errors, `${materialPath}.id`, `duplicate material id: ${id}`);
    } else {
      seenMaterialIds.add(id);
    }
  }

  const kind = typeof material.kind === 'string' ? material.kind : null;
  if (!MATERIAL_KINDS.has(kind)) {
    pushMessage(errors, `${materialPath}.kind`, 'must be one of: sprite, tile, ui');
  }

  const sampler = typeof material.sampler === 'string' ? material.sampler : null;
  if (!SAMPLERS.has(sampler)) {
    pushMessage(errors, `${materialPath}.sampler`, 'must be one of: nearest, linear');
  }

  const alphaMode = typeof material.alphaMode === 'string' ? material.alphaMode : null;
  if (!ALPHA_MODES.has(alphaMode)) {
    pushMessage(errors, `${materialPath}.alphaMode`, 'must be one of: opaque, blend, mask');
  }

  return {
    id,
    kind,
    sampler,
    alphaMode,
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function validateBinding(binding, index, options) {
  const {
    collectionName,
    target,
    expectedMaterialKind,
    seenIds,
    atlasIds,
    regionKeys,
    materialLookup
  } = options;
  const bindingPath = `$.${collectionName}[${index}]`;
  const errors = [];
  const warnings = [];

  if (!isPlainObject(binding)) {
    pushMessage(errors, bindingPath, `${target} binding must be an object`);
    return {
      id: null,
      atlasId: null,
      regionId: null,
      materialId: null,
      atlasFound: false,
      regionFound: false,
      materialFound: false,
      ok: false,
      errors,
      warnings
    };
  }

  validateUnknownKeys(binding, BINDING_KEYS, bindingPath, errors);

  const id = readId(binding.id, `${bindingPath}.id`, errors);
  if (id !== null) {
    if (seenIds.has(id)) {
      pushMessage(errors, `${bindingPath}.id`, `duplicate ${target} binding id: ${id}`);
    } else {
      seenIds.add(id);
    }
  }

  const atlasId = readNonEmptyString(binding.atlasId, `${bindingPath}.atlasId`, errors);
  const regionId = readNonEmptyString(binding.regionId, `${bindingPath}.regionId`, errors);
  const materialId = readNonEmptyString(binding.materialId, `${bindingPath}.materialId`, errors);
  const atlasFound = atlasId !== null && atlasIds.has(atlasId);
  const regionFound = atlasId !== null && regionId !== null && regionKeys.has(`${atlasId}#${regionId}`);
  const material = materialId === null ? undefined : materialLookup.get(materialId);
  const materialFound = material !== undefined;

  if (atlasId !== null && !atlasFound) {
    pushMessage(errors, `${bindingPath}.atlasId`, `unknown atlas id: ${atlasId}`);
  }

  if (atlasId !== null && regionId !== null && !regionFound) {
    pushMessage(errors, `${bindingPath}.regionId`, `unknown region id: ${regionId} for atlas ${atlasId}`);
  }

  if (materialId !== null && !materialFound) {
    pushMessage(errors, `${bindingPath}.materialId`, `unknown material id: ${materialId}`);
  }

  if (materialFound && material.kind !== expectedMaterialKind) {
    pushMessage(errors, `${bindingPath}.materialId`, `material kind must be ${expectedMaterialKind} for ${target} binding: ${materialId}`);
  }

  return {
    id,
    atlasId,
    regionId,
    materialId,
    atlasFound,
    regionFound,
    materialFound,
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function createSummary(assetManifestReport, atlases, regions, materials, spriteBindings, tileBindings) {
  const referencedAssetIds = [...new Set(atlases.map((atlas) => atlas.assetId).filter((id) => id !== null))].sort();
  const referencedMaterialIds = [
    ...new Set(
      [...spriteBindings, ...tileBindings]
        .map((binding) => binding.materialId)
        .filter((id) => id !== null)
    )
  ].sort();

  return {
    assetCount: assetManifestReport?.ok === true ? assetManifestReport.assetManifest.assets.length : 0,
    atlasCount: atlases.length,
    regionCount: regions.length,
    materialCount: materials.length,
    spriteBindingCount: spriteBindings.length,
    tileBindingCount: tileBindings.length,
    referencedAssetIds,
    referencedMaterialIds
  };
}

function createOrphanWarnings(regions, materials, spriteBindings, tileBindings) {
  const usedRegions = new Set(
    [...spriteBindings, ...tileBindings]
      .filter((binding) => binding.atlasId !== null && binding.regionId !== null && binding.regionFound)
      .map((binding) => `${binding.atlasId}#${binding.regionId}`)
  );
  const usedMaterials = new Set(
    [...spriteBindings, ...tileBindings]
      .filter((binding) => binding.materialId !== null && binding.materialFound)
      .map((binding) => binding.materialId)
  );
  const warnings = [];

  for (const region of regions) {
    if (region.atlasId !== null && region.id !== null && region.ok && !usedRegions.has(`${region.atlasId}#${region.id}`)) {
      warnings.push({
        target: 'region',
        ref: `${region.atlasId}#${region.id}`,
        path: '$.atlases[].regions[]',
        message: 'region is not referenced by any sprite or tile binding'
      });
    }
  }

  for (const material of materials) {
    if (material.id !== null && material.ok && !usedMaterials.has(material.id)) {
      warnings.push({
        target: 'material',
        ref: material.id,
        path: '$.materials[]',
        message: 'material is not referenced by any sprite or tile binding'
      });
    }
  }

  return warnings;
}

function createReport({
  absolutePath,
  assetManifestPath,
  assetManifestAbsolutePath,
  assetManifestReport,
  manifest,
  manifestErrors,
  assetManifestErrors,
  atlases,
  regions,
  materials,
  spriteBindings,
  tileBindings
}) {
  const atlasErrors = atlases.flatMap((atlas) =>
    atlas.errors.map((error) => createRootMessage('atlas', atlas.id, error))
  );
  const regionErrors = regions.flatMap((region) =>
    region.errors.map((error) => createRootMessage('region', region.id === null ? region.atlasId : `${region.atlasId ?? 'atlas'}#${region.id}`, error))
  );
  const materialErrors = materials.flatMap((material) =>
    material.errors.map((error) => createRootMessage('material', material.id, error))
  );
  const spriteBindingErrors = spriteBindings.flatMap((binding) =>
    binding.errors.map((error) => createRootMessage('spriteBinding', binding.id, error))
  );
  const tileBindingErrors = tileBindings.flatMap((binding) =>
    binding.errors.map((error) => createRootMessage('tileBinding', binding.id, error))
  );
  const errors = [
    ...manifestErrors.map((error) => createRootMessage('manifest', null, error)),
    ...assetManifestErrors.map((error) => createRootMessage('assetManifest', null, error)),
    ...atlasErrors,
    ...regionErrors,
    ...materialErrors,
    ...spriteBindingErrors,
    ...tileBindingErrors
  ].sort(compareReportMessages);
  const warnings = createOrphanWarnings(regions, materials, spriteBindings, tileBindings).sort(compareReportMessages);

  return {
    atlasMaterialManifestReportVersion: ATLAS_MATERIAL_MANIFEST_REPORT_VERSION,
    ok: errors.length === 0,
    absolutePath,
    assetManifestPath,
    assetManifestAbsolutePath,
    manifest,
    summary: createSummary(assetManifestReport, atlases, regions, materials, spriteBindings, tileBindings),
    atlases: [...atlases].sort(compareByKeys('id', 'assetId')),
    regions: [...regions].sort(compareByKeys('atlasId', 'id')),
    materials: [...materials].sort(compareByKeys('id')),
    spriteBindings: [...spriteBindings].sort(compareByKeys('id')),
    tileBindings: [...tileBindings].sort(compareByKeys('id')),
    errors,
    warnings
  };
}

export async function buildAtlasMaterialManifestReportV1(manifestPath) {
  assertNonEmptyString(manifestPath, 'manifestPath');

  const absolutePath = path.resolve(manifestPath);
  const manifestDir = path.dirname(absolutePath);

  let raw;
  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return createReport({
        absolutePath,
        assetManifestPath: null,
        assetManifestAbsolutePath: null,
        assetManifestReport: null,
        manifest: null,
        manifestErrors: [
          {
            path: '$',
            message: 'atlas/material manifest file was not found'
          }
        ],
        assetManifestErrors: [],
        atlases: [],
        regions: [],
        materials: [],
        spriteBindings: [],
        tileBindings: []
      });
    }

    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return createReport({
      absolutePath,
      assetManifestPath: null,
      assetManifestAbsolutePath: null,
      assetManifestReport: null,
      manifest: null,
      manifestErrors: [
        {
          path: '$',
          message: 'atlas/material manifest JSON is malformed'
        }
      ],
      assetManifestErrors: [],
      atlases: [],
      regions: [],
      materials: [],
      spriteBindings: [],
      tileBindings: []
    });
  }

  const manifestErrors = validateManifestShape(manifest);
  const {
    assetManifestPath,
    assetManifestAbsolutePath,
    assetManifestReport,
    errors: assetManifestErrors
  } = await inspectAssetManifest(manifest, manifestDir);
  const assetLookup = createAssetLookup(assetManifestReport);
  const seenAtlasIds = new Set();
  const atlasResults = Array.isArray(manifest?.atlases)
    ? manifest.atlases.map((atlas, index) => validateAtlas(atlas, index, assetLookup, seenAtlasIds))
    : [];
  const atlases = atlasResults.map((result) => result.atlas);
  const regions = atlasResults.flatMap((result) => result.regions);
  const atlasIds = new Set(atlases.filter((atlas) => atlas.id !== null).map((atlas) => atlas.id));
  const regionKeys = new Set(
    regions
      .filter((region) => region.atlasId !== null && region.id !== null)
      .map((region) => `${region.atlasId}#${region.id}`)
  );
  const seenMaterialIds = new Set();
  const materials = Array.isArray(manifest?.materials)
    ? manifest.materials.map((material, index) => validateMaterial(material, index, seenMaterialIds))
    : [];
  const materialLookup = new Map(materials.filter((material) => material.id !== null).map((material) => [material.id, material]));
  const seenSpriteIds = new Set();
  const spriteBindings = Array.isArray(manifest?.sprites)
    ? manifest.sprites.map((binding, index) =>
        validateBinding(binding, index, {
          collectionName: 'sprites',
          target: 'sprite',
          expectedMaterialKind: 'sprite',
          seenIds: seenSpriteIds,
          atlasIds,
          regionKeys,
          materialLookup
        })
      )
    : [];
  const seenTileIds = new Set();
  const tileBindings = Array.isArray(manifest?.tiles)
    ? manifest.tiles.map((binding, index) =>
        validateBinding(binding, index, {
          collectionName: 'tiles',
          target: 'tile',
          expectedMaterialKind: 'tile',
          seenIds: seenTileIds,
          atlasIds,
          regionKeys,
          materialLookup
        })
      )
    : [];

  return createReport({
    absolutePath,
    assetManifestPath,
    assetManifestAbsolutePath,
    assetManifestReport,
    manifest,
    manifestErrors,
    assetManifestErrors,
    atlases,
    regions,
    materials,
    spriteBindings,
    tileBindings
  });
}
