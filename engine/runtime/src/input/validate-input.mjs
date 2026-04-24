import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

export async function validateInputBindingsFile(inputPath) {
  const absolutePath = path.resolve(inputPath);
  const raw = await readFile(absolutePath, 'utf8');
  const bindings = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(bindings, registry['input_bindings.schema.json'].schema, registry, '$', []);

  return {
    ok: errors.length === 0,
    absolutePath,
    bindings,
    errors
  };
}

export function formatInputValidationReport(report) {
  const lines = [];
  lines.push(`Input path: ${report.absolutePath}`);
  lines.push(`Version: ${report.bindings.version ?? '(missing)'}`);
  lines.push(`Actions: ${Array.isArray(report.bindings.actions) ? report.bindings.actions.length : 0}`);
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
