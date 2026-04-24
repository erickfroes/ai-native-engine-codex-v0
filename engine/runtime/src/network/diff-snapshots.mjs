import { validateNetMessageFile } from './validate-net-message.mjs';

function toEntityMap(message) {
  const entities = message.payload?.entities;
  if (!Array.isArray(entities)) {
    return new Map();
  }

  return new Map(
    entities
      .filter((entity) => entity && typeof entity.id === 'string')
      .map((entity) => [entity.id, entity])
  );
}

function changedEntityCount(beforeMap, afterMap) {
  let changed = 0;
  for (const [id, nextEntity] of afterMap.entries()) {
    const prevEntity = beforeMap.get(id);
    if (!prevEntity || JSON.stringify(prevEntity.components ?? {}) !== JSON.stringify(nextEntity.components ?? {})) {
      changed += 1;
    }
  }

  return changed;
}

export async function diffNetworkSnapshotFiles(beforePath, afterPath) {
  const beforeReport = await validateNetMessageFile(beforePath);
  const afterReport = await validateNetMessageFile(afterPath);

  const errors = [...beforeReport.errors, ...afterReport.errors];
  if (errors.length > 0) {
    return {
      ok: false,
      beforePath: beforeReport.absolutePath,
      afterPath: afterReport.absolutePath,
      errors,
      diff: null
    };
  }

  const beforeMap = toEntityMap(beforeReport.message);
  const afterMap = toEntityMap(afterReport.message);
  const beforeIds = new Set(beforeMap.keys());
  const afterIds = new Set(afterMap.keys());

  const addedEntityIds = [...afterIds].filter((id) => !beforeIds.has(id)).sort();
  const removedEntityIds = [...beforeIds].filter((id) => !afterIds.has(id)).sort();

  return {
    ok: true,
    beforePath: beforeReport.absolutePath,
    afterPath: afterReport.absolutePath,
    errors: [],
    diff: {
      opcode: afterReport.message.opcode,
      fromTick: beforeReport.message.payload?.tick ?? null,
      toTick: afterReport.message.payload?.tick ?? null,
      beforeEntityCount: beforeMap.size,
      afterEntityCount: afterMap.size,
      addedEntityIds,
      removedEntityIds,
      changedEntityCount: changedEntityCount(beforeMap, afterMap)
    }
  };
}

export function formatNetworkSnapshotDiffReport(report) {
  const lines = [];
  lines.push(`Snapshot A: ${report.beforePath}`);
  lines.push(`Snapshot B: ${report.afterPath}`);
  lines.push('');
  lines.push(report.ok ? 'Status: OK' : 'Status: INVALID');

  if (!report.ok) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      lines.push(`- ${error.path}: ${error.message}`);
    }
    return lines.join('\n');
  }

  lines.push('');
  lines.push(`Opcode: ${report.diff.opcode ?? '(missing)'}`);
  lines.push(`Ticks: ${report.diff.fromTick ?? '(missing)'} -> ${report.diff.toTick ?? '(missing)'}`);
  lines.push(`Entities: ${report.diff.beforeEntityCount} -> ${report.diff.afterEntityCount}`);
  lines.push(`Added: ${report.diff.addedEntityIds.join(', ') || '(none)'}`);
  lines.push(`Removed: ${report.diff.removedEntityIds.join(', ') || '(none)'}`);
  lines.push(`Changed: ${report.diff.changedEntityCount}`);

  return lines.join('\n');
}
