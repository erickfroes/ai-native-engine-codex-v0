import { buildAtlasMaterialManifestReportV1 } from '../assets/build-atlas-material-manifest-report-v1.mjs';
import { sha256Hex } from '../save/canonical-json.mjs';

const ATLAS_REGION_BINDING_CONTRACT_VERSION = 1;
const LEGACY_SPRITE_COMPONENT_KIND = 'sprite';
const VISUAL_SPRITE_COMPONENT_KIND = 'visual.sprite';

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`resolveAtlasMaterialRenderInputsV1: \`${name}\` must be an object`);
  }
}

function assertNonEmptyString(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`resolveAtlasMaterialRenderInputsV1: \`${name}\` must be a non-empty string`);
  }
}

function getComponent(entity, kind) {
  return (entity.components ?? []).find((component) => component?.kind === kind);
}

function getSpriteComponent(entity) {
  return getComponent(entity, VISUAL_SPRITE_COMPONENT_KIND)
    ?? getComponent(entity, LEGACY_SPRITE_COMPONENT_KIND);
}

function formatAtlasMaterialReportErrors(report) {
  return report.errors.map((error) => `${error.target} ${error.ref ?? '(root)'} ${error.path}: ${error.message}`).join('; ');
}

function createAtlasLookups(report) {
  const regionsByKey = new Map(
    report.regions
      .filter((region) => region.ok && region.atlasId !== null && region.id !== null)
      .map((region) => [`${region.atlasId}#${region.id}`, region])
  );
  const materialsById = new Map(
    report.materials
      .filter((material) => material.ok && material.id !== null)
      .map((material) => [material.id, material])
  );
  const spriteBindingsById = new Map(
    report.spriteBindings
      .filter((binding) => binding.ok && binding.id !== null)
      .map((binding) => [binding.id, binding])
  );

  return { regionsByKey, materialsById, spriteBindingsById };
}

function readAtlasBindingRef(entity, sprite) {
  const fields = sprite?.fields ?? {};

  if (fields.atlasBindingId !== undefined) {
    assertNonEmptyString(`entity ${entity.id} ${sprite.kind}.fields.atlasBindingId`, fields.atlasBindingId);
    return {
      id: fields.atlasBindingId.trim(),
      source: 'atlasBindingId'
    };
  }

  const assetId = fields.assetId;
  return typeof assetId === 'string' && assetId.trim().length > 0
    ? {
        id: assetId.trim(),
        source: 'assetId'
      }
    : undefined;
}

function toSpriteAtlasMetadata(entity, bindingRef, binding, region, material) {
  return {
    drawCallId: entity.id,
    entityId: entity.id,
    bindingId: binding.id,
    bindingSource: bindingRef.source,
    atlasId: binding.atlasId,
    regionId: binding.regionId,
    materialId: binding.materialId,
    assetId: region.assetId,
    sourceX: region.x,
    sourceY: region.y,
    sourceWidth: region.width,
    sourceHeight: region.height,
    sampler: material.sampler,
    alphaMode: material.alphaMode
  };
}

function patchSceneForAtlasSprites(scene, report) {
  const { regionsByKey, materialsById, spriteBindingsById } = createAtlasLookups(report);
  const sprites = [];
  const entities = (scene.entities ?? []).map((entity) => {
    const sprite = getSpriteComponent(entity);
    const bindingRef = readAtlasBindingRef(entity, sprite);
    const binding = bindingRef ? spriteBindingsById.get(bindingRef.id) : undefined;

    if (!binding) {
      if (bindingRef?.source === 'atlasBindingId') {
        throw new Error(
          `resolveAtlasMaterialRenderInputsV1: entity \`${entity.id}\` ${sprite.kind}.fields.atlasBindingId references unknown sprite binding \`${bindingRef.id}\``
        );
      }
      return entity;
    }

    const region = regionsByKey.get(`${binding.atlasId}#${binding.regionId}`);
    const material = materialsById.get(binding.materialId);
    if (!region || !material) {
      return entity;
    }

    sprites.push(toSpriteAtlasMetadata(entity, bindingRef, binding, region, material));

    const fields = sprite.fields ?? {};
    const patchedFields = {
      ...fields,
      assetId: region.assetId,
      width: Number.isInteger(fields.width) && fields.width >= 1 ? fields.width : region.width,
      height: Number.isInteger(fields.height) && fields.height >= 1 ? fields.height : region.height
    };
    const patchedComponents = (entity.components ?? []).map((component) =>
      component === sprite
        ? {
            ...component,
            fields: patchedFields
          }
        : component
    );

    return {
      ...entity,
      components: patchedComponents
    };
  });

  sprites.sort((left, right) => left.drawCallId.localeCompare(right.drawCallId) || left.bindingId.localeCompare(right.bindingId));

  return {
    scene: sprites.length > 0 ? { ...scene, entities } : scene,
    atlasMaterial: {
      enabled: true,
      atlasRegionBindingContractVersion: ATLAS_REGION_BINDING_CONTRACT_VERSION,
      atlasMaterialManifestReportVersion: report.atlasMaterialManifestReportVersion,
      hashAlgorithm: 'sha256',
      bindingHash: sha256Hex({
        atlasRegionBindingContractVersion: ATLAS_REGION_BINDING_CONTRACT_VERSION,
        scene: scene.metadata.name,
        sprites
      }),
      scene: scene.metadata.name,
      sprites,
      warnings: [],
      invalidRefs: []
    }
  };
}

export async function resolveAtlasMaterialRenderInputsV1(scene, options = {}) {
  assertObject(scene, 'scene');
  assertObject(options, 'options');

  if (options.atlasMaterialManifestPath === undefined) {
    return {
      scene,
      assetManifestPath: options.assetManifestPath,
      atlasMaterial: undefined,
      atlasMaterialReport: undefined
    };
  }

  assertNonEmptyString('options.atlasMaterialManifestPath', options.atlasMaterialManifestPath);

  if (options.assetManifestPath !== undefined) {
    throw new Error(
      'resolveAtlasMaterialRenderInputsV1: provide only one of `options.assetManifestPath` or `options.atlasMaterialManifestPath`'
    );
  }

  const report = await buildAtlasMaterialManifestReportV1(options.atlasMaterialManifestPath);
  if (!report.ok) {
    throw new Error(`resolveAtlasMaterialRenderInputsV1: atlas/material manifest is invalid: ${formatAtlasMaterialReportErrors(report)}`);
  }

  const patched = patchSceneForAtlasSprites(scene, report);

  return {
    scene: patched.scene,
    assetManifestPath: report.assetManifestAbsolutePath,
    atlasMaterial: patched.atlasMaterial,
    atlasMaterialReport: report
  };
}
