import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { loadSchemaRegistry } from '../schema/registry.mjs';
import { validateWithSchema } from '../schema/mini-json-schema.mjs';

function buildWorldSnapshotContractErrors(message) {
  const errors = [];

  if (message.direction !== 'server_to_client') {
    errors.push({
      path: '$.direction',
      message: 'world.snapshot must use server_to_client direction'
    });
  }

  if (message.reliability !== 'reliable') {
    errors.push({
      path: '$.reliability',
      message: 'world.snapshot must use reliable delivery'
    });
  }

  const tick = message.payload?.tick;
  if (!Number.isInteger(tick) || tick < 0) {
    errors.push({
      path: '$.payload.tick',
      message: 'world.snapshot requires non-negative integer tick'
    });
  }

  const entities = message.payload?.entities;
  if (!Array.isArray(entities)) {
    errors.push({
      path: '$.payload.entities',
      message: 'world.snapshot requires payload.entities array'
    });
    return errors;
  }

  const seenIds = new Set();
  for (let index = 0; index < entities.length; index += 1) {
    const id = entities[index]?.id;
    if (typeof id !== 'string' || id.trim().length === 0) {
      errors.push({
        path: `$.payload.entities[${index}].id`,
        message: 'entity id must be a non-empty string'
      });
      continue;
    }

    if (seenIds.has(id)) {
      errors.push({
        path: `$.payload.entities[${index}].id`,
        message: `duplicate entity id in snapshot: ${id}`
      });
      continue;
    }

    seenIds.add(id);
  }

  return errors;
}

function buildContractErrors(message) {
  if (message?.opcode === 'world.snapshot') {
    return buildWorldSnapshotContractErrors(message);
  }

  return [];
}

export async function validateNetMessageFile(messagePath) {
  const absolutePath = path.resolve(messagePath);
  const raw = await readFile(absolutePath, 'utf8');
  const message = JSON.parse(raw);

  const registry = await loadSchemaRegistry();
  const errors = validateWithSchema(message, registry['net_message.schema.json'].schema, registry, '$', []);
  if (errors.length === 0) {
    errors.push(...buildContractErrors(message));
  }

  return {
    ok: errors.length === 0,
    absolutePath,
    message,
    errors
  };
}

export function formatNetMessageValidationReport(report) {
  const lines = [];
  lines.push(`Network message path: ${report.absolutePath}`);
  lines.push(`Opcode: ${report.message.opcode ?? '(missing)'}`);
  lines.push(`Version: ${report.message.version ?? '(missing)'}`);
  lines.push(`Direction: ${report.message.direction ?? '(missing)'}`);
  lines.push(`Reliability: ${report.message.reliability ?? '(missing)'}`);
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
