import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../schema/mini-json-schema.mjs';

const inputDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(inputDir, '../../../../');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'ui-explicit-input-v1.schema.json');
const schemaFileName = 'ui-explicit-input-v1.schema.json';

let cachedSchemaRegistry = null;

async function loadUiExplicitInputV1SchemaRegistry() {
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

function validateControlledFields(uiExplicitInput, errors) {
  if (uiExplicitInput?.uiExplicitInputVersion !== 1) {
    errors.push({
      path: '$.uiExplicitInputVersion',
      message: 'must be 1'
    });
  }

  const action = uiExplicitInput?.action;
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    return;
  }

  if (action.type === 'navigate' && action.direction === undefined) {
    errors.push({
      path: '$.action.direction',
      message: 'is required for navigate'
    });
  }

  if (action.type === 'activate' && action.direction !== undefined) {
    errors.push({
      path: '$.action.direction',
      message: 'is not allowed for activate'
    });
  }
}

export async function validateUiExplicitInputV1(uiExplicitInput) {
  const registry = await loadUiExplicitInputV1SchemaRegistry();
  const errors = validateWithSchema(uiExplicitInput, registry[schemaFileName].schema, registry, '$', []);
  validateControlledFields(uiExplicitInput, errors);

  return {
    ok: errors.length === 0,
    uiExplicitInput,
    errors
  };
}

export async function validateUiExplicitInputV1File(uiExplicitInputPath) {
  const absolutePath = path.resolve(uiExplicitInputPath);
  const raw = await readFile(absolutePath, 'utf8');
  const uiExplicitInput = JSON.parse(raw);
  const report = await validateUiExplicitInputV1(uiExplicitInput);

  return {
    ok: report.ok,
    absolutePath,
    uiExplicitInput,
    errors: report.errors
  };
}
