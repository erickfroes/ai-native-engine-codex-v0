import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';
import { validateSceneInvariants } from './invariants.mjs';
import { summarizeScene } from './summary.mjs';

export async function validateSceneFile(scenePath) {
  const absolutePath = path.resolve(scenePath);
  const raw = await readFile(absolutePath, 'utf8');
  const scene = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const shapeErrors = validateWithSchema(scene, registry['scene.schema.json'].schema, registry, '$', []);
  const invariantReport = validateSceneInvariants(scene);

  const errors = [...shapeErrors, ...invariantReport.errors];
  const warnings = [...invariantReport.warnings];
  const summary = summarizeScene(scene);

  return {
    ok: errors.length === 0,
    absolutePath,
    scene,
    summary,
    errors,
    warnings
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
