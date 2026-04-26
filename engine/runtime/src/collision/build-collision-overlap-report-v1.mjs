import { buildCollisionBoundsReportV1 } from './build-collision-bounds-report-v1.mjs';

function boundsOverlap(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function toOverlap(left, right) {
  return {
    entityAId: left.entityId,
    entityBId: right.entityId,
    solid: left.solid === true && right.solid === true
  };
}

export async function buildCollisionOverlapReportV1(sceneOrPath) {
  const boundsReport = await buildCollisionBoundsReportV1(sceneOrPath);
  const overlaps = [];

  for (let leftIndex = 0; leftIndex < boundsReport.bounds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < boundsReport.bounds.length; rightIndex += 1) {
      const left = boundsReport.bounds[leftIndex];
      const right = boundsReport.bounds[rightIndex];

      if (boundsOverlap(left, right)) {
        overlaps.push(toOverlap(left, right));
      }
    }
  }

  return {
    collisionOverlapReportVersion: 1,
    scene: boundsReport.scene,
    overlaps
  };
}
