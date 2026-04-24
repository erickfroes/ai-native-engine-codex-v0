import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

export async function validateUILayoutFile(uiPath) {
  const absolutePath = path.resolve(uiPath);
  const raw = await readFile(absolutePath, 'utf8');
  const layout = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(layout, registry['ui_layout.schema.json'].schema, registry, '$', []);

  return {
    ok: errors.length === 0,
    absolutePath,
    layout,
    errors
  };
}

export function formatUILayoutReport(report) {
  const lines = [];
  lines.push(`UI path: ${report.absolutePath}`);
  lines.push(`Screen: ${report.layout.screen ?? '(missing)'}`);
  lines.push(`Root widgets: ${Array.isArray(report.layout.widgets) ? report.layout.widgets.length : 0}`);
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
