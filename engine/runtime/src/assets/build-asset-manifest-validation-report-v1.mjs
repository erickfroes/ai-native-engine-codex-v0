import path from 'node:path';

import { validateAssetManifestV1File } from './validate-asset-manifest-v1.mjs';

const ASSET_MANIFEST_VALIDATION_REPORT_VERSION = 1;

export async function buildAssetManifestValidationReportV1(assetManifestPath) {
  if (typeof assetManifestPath !== 'string' || assetManifestPath.trim().length === 0) {
    throw new Error('buildAssetManifestValidationReportV1: `assetManifestPath` must be a non-empty string');
  }

  const absolutePath = path.resolve(assetManifestPath);

  try {
    const report = await validateAssetManifestV1File(assetManifestPath);

    return {
      assetManifestValidationReportVersion: ASSET_MANIFEST_VALIDATION_REPORT_VERSION,
      ok: report.ok,
      absolutePath: report.absolutePath,
      assetManifest: report.assetManifest,
      errors: report.errors
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        assetManifestValidationReportVersion: ASSET_MANIFEST_VALIDATION_REPORT_VERSION,
        ok: false,
        absolutePath,
        assetManifest: null,
        errors: [
          {
            path: '$',
            message: 'asset manifest file was not found'
          }
        ]
      };
    }

    if (error instanceof SyntaxError) {
      return {
        assetManifestValidationReportVersion: ASSET_MANIFEST_VALIDATION_REPORT_VERSION,
        ok: false,
        absolutePath,
        assetManifest: null,
        errors: [
          {
            path: '$',
            message: 'asset manifest JSON is malformed'
          }
        ]
      };
    }

    throw error;
  }
}
