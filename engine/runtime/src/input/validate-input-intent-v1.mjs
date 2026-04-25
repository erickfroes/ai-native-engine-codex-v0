import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../schema/mini-json-schema.mjs';

const inputDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(inputDir, '../../../../');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'input-intent-v1.schema.json');
const schemaFileName = 'input-intent-v1.schema.json';

let cachedSchemaRegistry = null;

async function loadInputIntentV1SchemaRegistry() {
  if (cachedSchemaRegistry) {
    return cachedSchemaRegistry;
  }

  const raw = await readFile(schemaPath, 'utf8');
  cachedSchemaRegistry = {
    [schemaFileName]: {
      fileName: schemaFileName,
      absolutePath: schemaPath,
      schema: JSON.parse(raw)
    }
  };

  return cachedSchemaRegistry;
}

function validateControlledFields(inputIntent, errors) {
  if (typeof inputIntent?.entityId === 'string' && inputIntent.entityId.trim().length === 0) {
    errors.push({
      path: '$.entityId',
      message: 'must not be blank'
    });
  }
}

export async function validateInputIntentV1File(inputIntentPath) {
  const absolutePath = path.resolve(inputIntentPath);
  const raw = await readFile(absolutePath, 'utf8');
  const inputIntent = JSON.parse(raw);

  const registry = await loadInputIntentV1SchemaRegistry();
  const errors = validateWithSchema(inputIntent, registry[schemaFileName].schema, registry, '$', []);
  validateControlledFields(inputIntent, errors);

  return {
    ok: errors.length === 0,
    absolutePath,
    inputIntent,
    errors
  };
}
