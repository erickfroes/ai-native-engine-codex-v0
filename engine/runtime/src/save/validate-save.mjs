import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

export async function validateSaveFile(savePath) {
  const absolutePath = path.resolve(savePath);
  const raw = await readFile(absolutePath, 'utf8');
  const save = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(save, registry['savegame.schema.json'].schema, registry, '$', []);

  return {
    ok: errors.length === 0,
    absolutePath,
    save,
    errors
  };
}

export function formatSaveValidationReport(report) {
  const lines = [];
  lines.push(`Save path: ${report.absolutePath}`);
  lines.push(`Format version: ${report.save.formatVersion ?? '(missing)'}`);
  lines.push(`Content version: ${report.save.contentVersion ?? '(missing)'}`);
  lines.push(`Scene: ${report.save.world?.scene ?? '(missing)'}`);
  lines.push(`Entities: ${Array.isArray(report.save.world?.entities) ? report.save.world.entities.length : 0}`);
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
