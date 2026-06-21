import { readFile } from 'node:fs/promises';
import path from 'node:path';

const IMAGE_MIME_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.bmp', 'image/bmp'],
  ['.svg', 'image/svg+xml']
]);
const SUPPORTED_PORTABLE_EXPORT_IMAGE_EXTENSIONS = [...IMAGE_MIME_TYPES.keys()];

function cloneDrawCall(drawCall) {
  return drawCall && typeof drawCall === 'object' && !Array.isArray(drawCall)
    ? { ...drawCall }
    : drawCall;
}

function resolveImageMimeType(assetSrc) {
  const extension = path.extname(assetSrc).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES.get(extension);

  if (!mimeType) {
    throw new Error(
      `materializePortableExportAssetSrcV2: unsupported image asset extension \`${extension || '(none)'}\` for \`${assetSrc}\`; supported extensions: ${SUPPORTED_PORTABLE_EXPORT_IMAGE_EXTENSIONS.join(', ')}`
    );
  }

  return mimeType;
}

async function readAssetAsDataUrl(assetPath, assetSrc) {
  const bytes = await readFile(assetPath);
  const mimeType = resolveImageMimeType(assetSrc);
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

export async function materializePortableExportAssetSrcV2(renderSnapshot, assetManifestPath) {
  if (typeof assetManifestPath !== 'string' || assetManifestPath.trim().length === 0) {
    return renderSnapshot;
  }

  if (!renderSnapshot || typeof renderSnapshot !== 'object' || !Array.isArray(renderSnapshot.drawCalls)) {
    throw new Error('materializePortableExportAssetSrcV2: `renderSnapshot.drawCalls` must be an array');
  }

  const assetRootDir = path.dirname(path.resolve(assetManifestPath));
  const dataUrlByAssetSrc = new Map();
  const drawCalls = await Promise.all(renderSnapshot.drawCalls.map(async (drawCall) => {
    if (
      !drawCall ||
      typeof drawCall !== 'object' ||
      Array.isArray(drawCall) ||
      drawCall.kind !== 'sprite' ||
      typeof drawCall.assetSrc !== 'string' ||
      drawCall.assetSrc.trim().length === 0
    ) {
      return cloneDrawCall(drawCall);
    }

    if (drawCall.assetSrc.startsWith('data:')) {
      return cloneDrawCall(drawCall);
    }

    let dataUrl = dataUrlByAssetSrc.get(drawCall.assetSrc);
    if (!dataUrl) {
      dataUrl = await readAssetAsDataUrl(path.resolve(assetRootDir, drawCall.assetSrc), drawCall.assetSrc);
      dataUrlByAssetSrc.set(drawCall.assetSrc, dataUrl);
    }

    return {
      ...drawCall,
      assetSrc: dataUrl
    };
  }));

  return {
    ...renderSnapshot,
    drawCalls
  };
}
