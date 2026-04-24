import path from 'node:path';

import { validateNetMessageFile } from './validate-net-message.mjs';

function entityIdsFromMessage(message) {
  return (message.payload?.entities ?? [])
    .map((entity) => entity.id)
    .filter((id) => typeof id === 'string')
    .sort();
}

function sequenceErrors(prevMessage, nextMessage) {
  const errors = [];

  if (prevMessage.opcode !== 'world.snapshot' || nextMessage.opcode !== 'world.snapshot') {
    errors.push({ path: '$.opcode', message: 'replication stream currently supports world.snapshot opcode only' });
  }

  if (prevMessage.opcode !== nextMessage.opcode) {
    errors.push({ path: '$.opcode', message: 'replication stream requires consistent opcode' });
  }

  if (prevMessage.version !== nextMessage.version) {
    errors.push({ path: '$.version', message: 'replication stream requires consistent version' });
  }

  if (prevMessage.direction !== 'server_to_client' || nextMessage.direction !== 'server_to_client') {
    errors.push({ path: '$.direction', message: 'replication stream must be server_to_client' });
  }

  if (prevMessage.reliability !== 'reliable' || nextMessage.reliability !== 'reliable') {
    errors.push({ path: '$.reliability', message: 'replication stream must use reliable delivery' });
  }

  const prevTick = prevMessage.payload?.tick;
  const nextTick = nextMessage.payload?.tick;
  if (!Number.isInteger(prevTick) || !Number.isInteger(nextTick) || nextTick <= prevTick) {
    errors.push({ path: '$.payload.tick', message: 'replication stream requires strictly increasing ticks' });
  }

  return errors;
}

export async function simulateNetworkReplication(snapshotPaths) {
  const absolutePaths = snapshotPaths.map((p) => path.resolve(p));
  const reports = await Promise.all(absolutePaths.map((p) => validateNetMessageFile(p)));

  const errors = [];
  for (const report of reports) {
    errors.push(...report.errors);
  }

  if (errors.length === 0) {
    for (let i = 1; i < reports.length; i += 1) {
      errors.push(...sequenceErrors(reports[i - 1].message, reports[i].message));
    }
  }

  const timeline = reports.map((report) => ({
    path: report.absolutePath,
    tick: report.message.payload?.tick ?? null,
    entityCount: entityIdsFromMessage(report.message).length,
    entityIds: entityIdsFromMessage(report.message)
  }));

  return {
    ok: errors.length === 0,
    snapshotCount: reports.length,
    timeline,
    errors
  };
}

export function formatNetworkReplicationSimulationReport(report) {
  const lines = [];
  lines.push(`Snapshots: ${report.snapshotCount}`);
  lines.push(report.ok ? 'Status: OK' : 'Status: INVALID');
  lines.push('');
  lines.push('Timeline:');

  for (const frame of report.timeline) {
    lines.push(`- tick ${frame.tick ?? '(missing)'} | entities=${frame.entityCount} | path=${frame.path}`);
  }

  if (!report.ok) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      lines.push(`- ${error.path}: ${error.message}`);
    }
  }

  return lines.join('\n');
}
