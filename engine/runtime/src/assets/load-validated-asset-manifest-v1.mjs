import { validateAssetManifestV1File } from './validate-asset-manifest-v1.mjs';

function formatAssetManifestErrors(report) {
  return report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
}

export async function loadValidatedAssetManifestV1(assetManifestPath) {
  const report = await validateAssetManifestV1File(assetManifestPath);

  if (report.ok) {
    return report.assetManifest;
  }

  const error = new Error(`asset manifest is invalid: ${formatAssetManifestErrors(report)}`);
  error.name = 'AssetManifestValidationError';
  error.report = report;
  throw error;
}
