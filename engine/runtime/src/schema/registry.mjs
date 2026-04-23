import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(runtimeDir, '../../../../');
const schemaDir = path.join(repoRoot, 'schemas');

let cachedRegistry = null;

async function readSchema(name) {
  const absolutePath = path.join(schemaDir, name);
  const raw = await readFile(absolutePath, 'utf8');
  const schema = JSON.parse(raw);
  return { absolutePath, schema };
}

export async function loadSchemaRegistry() {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const files = [
    'scene.schema.json',
    'component.schema.json',
    'net_message.schema.json',
    'savegame.schema.json'
  ];

  const entries = await Promise.all(
    files.map(async (fileName) => {
      const { absolutePath, schema } = await readSchema(fileName);
      return [
        fileName,
        {
          fileName,
          absolutePath,
          schema
        }
      ];
    })
  );

  cachedRegistry = Object.fromEntries(entries);
  return cachedRegistry;
}

export function getRepoRoot() {
  return repoRoot;
}
