import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';
import { validateSceneInvariants } from './invariants.mjs';
import { resolveScenePrefabsV1 } from './prefab-v1.mjs';
import { summarizeScene } from './summary.mjs';

export async function validateSceneFile(scenePath) {
  const absolutePath = path.resolve(scenePath);
  const raw = await readFile(absolutePath, 'utf8');
  const scene = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const shapeErrors = validateWithSchema(scene, registry['scene.schema.json'].schema, registry, '$', []);
  const rawInvariantReport = validateSceneInvariants(scene);

  let resolvedScene = scene;
  let prefabErrors = [];
  let prefabUsage = [];
  let prefabUsageV2 = [];
  let resolvedInvariantReport = { errors: [], warnings: [] };

  if (shapeErrors.length === 0 && rawInvariantReport.errors.length === 0) {
    const prefabResolution = await resolveScenePrefabsV1(scene, absolutePath);
    prefabErrors = prefabResolution.errors;
    prefabUsage = prefabResolution.prefabUsage;
    prefabUsageV2 = prefabResolution.prefabUsageV2;

    if (prefabErrors.length === 0) {
      resolvedScene = prefabResolution.scene;
      resolvedInvariantReport = validateSceneInvariants(resolvedScene);
    }
  }

  const errors = [...shapeErrors, ...rawInvariantReport.errors, ...prefabErrors, ...resolvedInvariantReport.errors];
  const warnings = [...rawInvariantReport.warnings, ...resolvedInvariantReport.warnings];
  const summary = summarizeScene(resolvedScene);

  return {
    ok: errors.length === 0,
    absolutePath,
    scene: resolvedScene,
    summary,
    errors,
    warnings,
    prefabUsage,
    prefabUsageV2
  };
}

export function formatValidationReport(report) {
  const lines = [];
  lines.push(`Scene: ${report.summary.name}`);
  lines.push(`Path: ${report.absolutePath}`);
  lines.push(`Entities: ${report.summary.entityCount}`);
  lines.push(`Components: ${report.summary.componentCount}`);
  lines.push(`Replicated components: ${report.summary.replicatedComponentCount}`);
  lines.push(`Systems: ${report.summary.systems.join(', ') || '(none)'}`);
  lines.push(`Assets: ${report.summary.assetRefs.join(', ') || '(none)'}`);
  lines.push('');

  if (report.ok) {
    lines.push('Status: OK');
  } else {
    lines.push('Status: INVALID');
  }

  if (report.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      lines.push(`- ${error.path}: ${error.message}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of report.warnings) {
      lines.push(`- ${warning.path}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
