import { validateSceneFile } from './validate-scene.mjs';

export async function loadSceneFile(scenePath) {
  const report = await validateSceneFile(scenePath);
  if (!report.ok) {
    const error = new Error(`Scene validation failed for ${report.absolutePath}`);
    error.name = 'SceneValidationError';
    error.report = report;
    throw error;
  }

  return report.scene;
}
