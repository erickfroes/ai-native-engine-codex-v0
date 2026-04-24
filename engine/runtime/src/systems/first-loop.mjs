import { loadSceneFile } from '../scene/load-scene.mjs';

function extractHealthValue(fields) {
  if (!fields || typeof fields !== 'object') {
    return null;
  }

  if (typeof fields.current === 'number') {
    return { key: 'current', value: fields.current };
  }

  if (typeof fields.hp === 'number') {
    return { key: 'hp', value: fields.hp };
  }

  return null;
}

function applyHealthDecay(scene, ticks) {
  const healthByEntity = {};
  let affectedEntities = 0;

  for (const entity of scene.entities ?? []) {
    for (const component of entity.components ?? []) {
      if (component.kind !== 'health') {
        continue;
      }

      const health = extractHealthValue(component.fields);
      if (!health) {
        continue;
      }

      const next = Math.max(0, health.value - ticks);
      healthByEntity[entity.id] = next;
      affectedEntities += 1;
    }
  }

  return { healthByEntity, affectedEntities };
}

export async function runFirstSystemLoop(scenePath, tickCount = 1) {
  const scene = await loadSceneFile(scenePath);
  const normalizedTickCount = Number.isInteger(tickCount) && tickCount > 0 ? tickCount : 1;

  const { healthByEntity, affectedEntities } = applyHealthDecay(scene, normalizedTickCount);

  return {
    sceneName: scene.metadata?.name ?? 'unknown',
    ticks: normalizedTickCount,
    affectedEntities,
    healthByEntity
  };
}

export function formatFirstSystemLoopReport(report) {
  const lines = [];
  lines.push(`Scene: ${report.sceneName}`);
  lines.push(`Ticks: ${report.ticks}`);
  lines.push(`Affected entities: ${report.affectedEntities}`);
  lines.push('');

  lines.push('Health snapshot:');
  for (const [entityId, value] of Object.entries(report.healthByEntity)) {
    lines.push(`- ${entityId}: ${value}`);
  }

  return lines.join('\n');
}
