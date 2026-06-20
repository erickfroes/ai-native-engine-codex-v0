import { validateSceneFile } from './validate-scene.mjs';

export async function buildPrefabUsageReportV1(scenePath) {
  if (typeof scenePath !== 'string' || scenePath.trim().length === 0) {
    throw new Error('buildPrefabUsageReportV1: `scenePath` must be a non-empty string');
  }

  const report = await validateSceneFile(scenePath);
  if (!report.ok) {
    const error = new Error(`Scene validation failed for ${report.absolutePath}`);
    error.name = 'SceneValidationError';
    error.report = report;
    throw error;
  }

  return {
    prefabUsageReportVersion: 1,
    scene: report.scene.metadata.name,
    prefabs: report.prefabUsage ?? []
  };
}
