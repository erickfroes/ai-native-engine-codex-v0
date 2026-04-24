import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

export async function validateRenderProfileFile(renderPath) {
  const absolutePath = path.resolve(renderPath);
  const raw = await readFile(absolutePath, 'utf8');
  const profile = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(profile, registry['render_profile.schema.json'].schema, registry, '$', []);

  return {
    ok: errors.length === 0,
    absolutePath,
    profile,
    errors
  };
}

export function formatRenderValidationReport(report) {
  const lines = [];
  lines.push(`Render path: ${report.absolutePath}`);
  lines.push(`Version: ${report.profile.version ?? '(missing)'}`);
  lines.push(`Backend: ${report.profile.pipeline?.backend ?? '(missing)'}`);
  lines.push(`Passes: ${Array.isArray(report.profile.pipeline?.passes) ? report.profile.pipeline.passes.length : 0}`);
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
