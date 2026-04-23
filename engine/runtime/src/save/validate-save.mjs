import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

const supportedSaveVersion = 1;

export async function validateSaveFile(savePath) {
  const absolutePath = path.resolve(savePath);
  const raw = await readFile(absolutePath, 'utf8');
  const save = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(save, registry['savegame.schema.json'].schema, registry, '$', []);

  if (errors.length === 0 && save.saveVersion !== supportedSaveVersion) {
    errors.push({
      path: '$.saveVersion',
      message: `unsupported saveVersion: ${save.saveVersion}; supported: ${supportedSaveVersion}`
    });
  }

  return {
    ok: errors.length === 0,
    absolutePath,
    save,
    errors,
    warnings: []
  };
}
