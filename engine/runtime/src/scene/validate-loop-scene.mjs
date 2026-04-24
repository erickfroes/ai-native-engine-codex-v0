import path from 'node:path';
import { readFile } from 'node:fs/promises';

import { getKnownSystemDefinition } from '../systems/system-registry.mjs';

function toIssue(code, message, extra = {}) {
  return {
    code,
    message,
    ...(extra.path === undefined ? {} : { path: extra.path }),
    ...(extra.system === undefined ? {} : { system: extra.system })
  };
}

function buildReport(scene, errors, warnings, systems) {
  return {
    sceneValidationReportVersion: 1,
    scene,
    valid: errors.length === 0,
    errors,
    warnings,
    systems
  };
}

export async function validateLoopScene(scenePath) {
  const absolutePath = path.resolve(scenePath);
  const warnings = [];
  const errors = [];
  const systems = [];

  let raw;
  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return buildReport(
        absolutePath,
        [toIssue('SCENE_FILE_NOT_FOUND', 'scene file was not found', { path: '$' })],
        warnings,
        systems
      );
    }
    throw error;
  }

  let sceneData;
  try {
    sceneData = JSON.parse(raw);
  } catch {
    return buildReport(
      absolutePath,
      [toIssue('SCENE_JSON_MALFORMED', 'scene JSON is malformed', { path: '$' })],
      warnings,
      systems
    );
  }

  const sceneName = typeof sceneData?.metadata?.name === 'string' && sceneData.metadata.name.length > 0
    ? sceneData.metadata.name
    : absolutePath;

  if (!Object.prototype.hasOwnProperty.call(sceneData, 'systems')) {
    errors.push(toIssue('SCENE_SYSTEMS_MISSING', 'scene must declare `systems`', { path: '$.systems' }));
    return buildReport(sceneName, errors, warnings, systems);
  }

  if (!Array.isArray(sceneData.systems)) {
    errors.push(toIssue('SCENE_SYSTEMS_EMPTY', 'scene `systems` must be a non-empty array', { path: '$.systems' }));
    return buildReport(sceneName, errors, warnings, systems);
  }

  if (sceneData.systems.length === 0) {
    errors.push(toIssue('SCENE_SYSTEMS_EMPTY', 'scene `systems` must not be empty', { path: '$.systems' }));
    return buildReport(sceneName, errors, warnings, systems);
  }

  for (let index = 0; index < sceneData.systems.length; index += 1) {
    const systemName = sceneData.systems[index];
    if (typeof systemName !== 'string' || systemName.trim().length === 0) {
      errors.push(
        toIssue('SCENE_SYSTEM_NAME_INVALID', 'system name must be a non-empty string', {
          path: `$.systems[${index}]`
        })
      );
      continue;
    }

    const definition = getKnownSystemDefinition(systemName);
    if (!definition) {
      systems.push({
        name: systemName,
        known: false
      });
      errors.push(
        toIssue('SCENE_SYSTEM_UNKNOWN', `unknown system: ${systemName}`, {
          path: `$.systems[${index}]`,
          system: systemName
        })
      );
      continue;
    }

    systems.push({
      name: definition.name,
      known: true,
      delta: definition.delta,
      deterministic: definition.deterministic
    });
  }

  return buildReport(sceneName, errors, warnings, systems);
}

export function formatSceneValidationReportV1(report) {
  const lines = [];
  lines.push(`Scene: ${report.scene}`);
  lines.push(`Scene validation report version: ${report.sceneValidationReportVersion}`);
  lines.push(`Status: ${report.valid ? 'VALID' : 'INVALID'}`);
  lines.push(`Systems: ${report.systems.map((system) => system.name).join(', ') || '(none)'}`);

  if (report.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of report.errors) {
      const pathPart = error.path ? `${error.path}: ` : '';
      const systemPart = error.system ? ` [system=${error.system}]` : '';
      lines.push(`- ${error.code}: ${pathPart}${error.message}${systemPart}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of report.warnings) {
      const pathPart = warning.path ? `${warning.path}: ` : '';
      const systemPart = warning.system ? ` [system=${warning.system}]` : '';
      lines.push(`- ${warning.code}: ${pathPart}${warning.message}${systemPart}`);
    }
  }

  return lines.join('\n');
}

