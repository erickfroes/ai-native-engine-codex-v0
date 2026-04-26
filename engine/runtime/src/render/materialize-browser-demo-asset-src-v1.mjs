import path from 'node:path';
import { pathToFileURL } from 'node:url';

function cloneDrawCall(drawCall) {
  return drawCall && typeof drawCall === 'object' && !Array.isArray(drawCall)
    ? { ...drawCall }
    : drawCall;
}

export function materializeBrowserDemoAssetSrcV1(renderSnapshot, assetManifestPath) {
  if (typeof assetManifestPath !== 'string' || assetManifestPath.trim().length === 0) {
    return renderSnapshot;
  }

  if (!renderSnapshot || typeof renderSnapshot !== 'object' || !Array.isArray(renderSnapshot.drawCalls)) {
    throw new Error('materializeBrowserDemoAssetSrcV1: `renderSnapshot.drawCalls` must be an array');
  }

  const assetRootDir = path.dirname(path.resolve(assetManifestPath));
  const drawCalls = renderSnapshot.drawCalls.map((drawCall) => {
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

    return {
      ...drawCall,
      assetSrc: pathToFileURL(path.resolve(assetRootDir, drawCall.assetSrc)).href
    };
  });

  return {
    ...renderSnapshot,
    drawCalls
  };
}
