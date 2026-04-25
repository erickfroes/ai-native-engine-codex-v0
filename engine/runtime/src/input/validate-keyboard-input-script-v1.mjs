import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { validateWithSchema } from '../schema/mini-json-schema.mjs';

const inputDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(inputDir, '../../../../');
const schemaPath = path.join(repoRoot, 'docs', 'schemas', 'keyboard-input-script-v1.schema.json');
const schemaFileName = 'keyboard-input-script-v1.schema.json';

let cachedSchemaRegistry = null;

async function loadKeyboardInputScriptV1SchemaRegistry() {
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

function validateControlledFields(script, errors) {
  if (
    typeof script?.entityId === 'string' &&
    script.entityId.trim().length === 0 &&
    !errors.some((error) => error.path === '$.entityId' && error.message === 'must not be blank')
  ) {
    errors.push({
      path: '$.entityId',
      message: 'must not be blank'
    });
  }

  if (!Array.isArray(script?.ticks)) {
    return;
  }

  const firstIndexByTick = new Map();
  for (let index = 0; index < script.ticks.length; index += 1) {
    const tickEntry = script.ticks[index];
    if (!Number.isInteger(tickEntry?.tick)) {
      continue;
    }

    if (firstIndexByTick.has(tickEntry.tick)) {
      errors.push({
        path: `$.ticks[${index}].tick`,
        message: `must be unique; duplicate of $.ticks[${firstIndexByTick.get(tickEntry.tick)}].tick`
      });
      continue;
    }

    firstIndexByTick.set(tickEntry.tick, index);
  }
}

export async function validateKeyboardInputScriptV1(script) {
  const registry = await loadKeyboardInputScriptV1SchemaRegistry();
  const errors = validateWithSchema(script, registry[schemaFileName].schema, registry, '$', []);
  validateControlledFields(script, errors);

  return {
    ok: errors.length === 0,
    keyboardInputScript: script,
    errors
  };
}

export async function validateKeyboardInputScriptV1File(scriptPath) {
  const absolutePath = path.resolve(scriptPath);
  const raw = await readFile(absolutePath, 'utf8');
  const keyboardInputScript = JSON.parse(raw);
  const report = await validateKeyboardInputScriptV1(keyboardInputScript);

  return {
    ok: report.ok,
    absolutePath,
    keyboardInputScript,
    errors: report.errors
  };
}
