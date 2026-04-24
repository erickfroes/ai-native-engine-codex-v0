import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';
import { migrateLegacySaveEnvelope } from './migrate-save.mjs';

const supportedSaveVersion = 1;
const saveValidationReportVersion = 1;

export async function validateSaveFile(savePath) {
  const absolutePath = path.resolve(savePath);
  const raw = await readFile(absolutePath, 'utf8');
  const save = JSON.parse(raw);
  const migratedSave = migrateLegacySaveEnvelope(save);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(migratedSave, registry['savegame.schema.json'].schema, registry, '$', []);

  if (errors.length === 0 && migratedSave.saveVersion !== supportedSaveVersion) {
    errors.push({
      path: '$.saveVersion',
      message: `unsupported saveVersion: ${migratedSave.saveVersion}; supported: ${supportedSaveVersion}`
    });
  }

  const report = {
    reportVersion: saveValidationReportVersion,
    ok: errors.length === 0,
    path: absolutePath,
    save: migratedSave,
    errors,
    warnings: []
  };

  const reportValidationErrors = validateWithSchema(
    report,
    registry['save_validation_report.schema.json'].schema,
    registry,
    '$',
    []
  );

  if (reportValidationErrors.length > 0) {
    throw new Error(
      `validateSaveFile produced invalid save validation report: ${JSON.stringify(reportValidationErrors)}`
    );
  }

  return report;
}
