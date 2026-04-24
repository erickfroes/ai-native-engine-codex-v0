import { validateNetMessageFile } from './validate-net-message.mjs';

function buildSequenceErrors(beforeMessage, afterMessage) {
  const errors = [];

  if (beforeMessage.opcode !== 'world.snapshot' || afterMessage.opcode !== 'world.snapshot') {
    errors.push({
      path: '$.opcode',
      message: 'snapshot sequence currently supports only world.snapshot opcode'
    });
  }

  if (beforeMessage.opcode !== afterMessage.opcode) {
    errors.push({
      path: '$.opcode',
      message: 'snapshot sequence requires matching opcode across messages'
    });
  }

  if (beforeMessage.version !== afterMessage.version) {
    errors.push({
      path: '$.version',
      message: 'snapshot sequence requires matching version across messages'
    });
  }

  if (beforeMessage.direction !== 'server_to_client' || afterMessage.direction !== 'server_to_client') {
    errors.push({
      path: '$.direction',
      message: 'snapshot sequence must be server_to_client for both messages'
    });
  }

  if (beforeMessage.reliability !== 'reliable' || afterMessage.reliability !== 'reliable') {
    errors.push({
      path: '$.reliability',
      message: 'snapshot sequence must use reliable delivery for both messages'
    });
  }

  const beforeTick = beforeMessage.payload?.tick;
  const afterTick = afterMessage.payload?.tick;
  if (!Number.isInteger(beforeTick) || !Number.isInteger(afterTick) || afterTick <= beforeTick) {
    errors.push({
      path: '$.payload.tick',
      message: 'snapshot sequence requires strictly increasing ticks'
    });
  }

  return errors;
}

export async function validateNetworkSnapshotSequence(beforePath, afterPath) {
  const beforeReport = await validateNetMessageFile(beforePath);
  const afterReport = await validateNetMessageFile(afterPath);

  const errors = [...beforeReport.errors, ...afterReport.errors];
  if (errors.length === 0) {
    errors.push(...buildSequenceErrors(beforeReport.message, afterReport.message));
  }

  const beforeTick = beforeReport.message.payload?.tick ?? null;
  const afterTick = afterReport.message.payload?.tick ?? null;
  const tickDelta = Number.isInteger(beforeTick) && Number.isInteger(afterTick)
    ? afterTick - beforeTick
    : null;

  return {
    ok: errors.length === 0,
    beforePath: beforeReport.absolutePath,
    afterPath: afterReport.absolutePath,
    summary: {
      opcode: afterReport.message.opcode ?? null,
      version: afterReport.message.version ?? null,
      direction: afterReport.message.direction ?? null,
      fromTick: beforeTick,
      toTick: afterTick,
      tickDelta
    },
    errors
  };
}

export function formatNetworkSnapshotSequenceReport(report) {
  const lines = [];
  lines.push(`Snapshot A: ${report.beforePath}`);
  lines.push(`Snapshot B: ${report.afterPath}`);
  lines.push(`Opcode: ${report.summary.opcode ?? '(missing)'}`);
  lines.push(`Version: ${report.summary.version ?? '(missing)'}`);
  lines.push(`Direction: ${report.summary.direction ?? '(missing)'}`);
  lines.push(`Ticks: ${report.summary.fromTick ?? '(missing)'} -> ${report.summary.toTick ?? '(missing)'}`);
  lines.push(`Tick delta: ${report.summary.tickDelta ?? '(missing)'}`);
  lines.push('');
  lines.push(report.ok ? 'Status: OK' : 'Status: INVALID');

  if (!report.ok) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      lines.push(`- ${error.path}: ${error.message}`);
    }
  }

  return lines.join('\n');
}
