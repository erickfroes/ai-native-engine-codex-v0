import { validatePrefabFileV1 } from './prefab-v1.mjs';

const PREFAB_VALIDATION_REPORT_VERSION = 1;

export async function buildPrefabValidationReportV1(prefabPath) {
  if (typeof prefabPath !== 'string' || prefabPath.trim().length === 0) {
    throw new Error('buildPrefabValidationReportV1: `prefabPath` must be a non-empty string');
  }

  const report = await validatePrefabFileV1(prefabPath);

  return {
    prefabValidationReportVersion: PREFAB_VALIDATION_REPORT_VERSION,
    ok: report.ok,
    absolutePath: report.absolutePath,
    prefab: report.prefab,
    errors: report.errors
  };
}
