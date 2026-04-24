import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

function sortByStringKey(items, key) {
  return [...items].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}

export function buildWorldSnapshotMessage(scene, options = {}) {
  const tick = Number.isInteger(options.tick) ? options.tick : 0;

  const entities = sortByStringKey(scene.entities ?? [], 'id')
    .map((entity) => {
      const replicatedComponents = sortByStringKey(entity.components ?? [], 'kind')
        .filter((component) => component.replicated)
        .map((component) => ({
          kind: component.kind,
          version: component.version,
          fields: component.fields
        }));

      if (replicatedComponents.length === 0) {
        return null;
      }

      return {
        id: entity.id,
        components: replicatedComponents
      };
    })
    .filter(Boolean);

  return {
    opcode: 'world.snapshot',
    version: 1,
    direction: 'server_to_client',
    reliability: 'unreliable',
    payload: {
      tick,
      entities
    }
  };
}

export async function validateNetMessageContract(message) {
  const registry = await loadSchemaRegistry();
  return validateWithSchema(message, registry['net_message.schema.json'].schema, registry, '$', []);
}
