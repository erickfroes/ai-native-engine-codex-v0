import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

export async function validatePrefabFile(prefabPath) {
  const absolutePath = path.resolve(prefabPath);
  const raw = await readFile(absolutePath, 'utf8');
  const prefab = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(prefab, registry['prefab.schema.json'].schema, registry, '$', []);

  return {
    ok: errors.length === 0,
    absolutePath,
    prefab,
    errors
  };
}

export function formatPrefabValidationReport(report) {
  const lines = [];
  lines.push(`Prefab: ${report.prefab.id ?? '(unknown)'}`);
  lines.push(`Path: ${report.absolutePath}`);
  lines.push(`Components: ${Array.isArray(report.prefab.components) ? report.prefab.components.length : 0}`);
  lines.push('');
  lines.push(report.ok ? 'Status: OK' : 'Status: INVALID');

  if (report.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      lines.push(`- ${error.path}: ${error.message}`);
    }
  }

  return lines.join('\n');
}
