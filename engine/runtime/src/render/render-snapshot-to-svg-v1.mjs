export const RENDER_SVG_VERSION = 1;

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`renderSnapshotToSvgV1: \`${name}\` must be an object`);
  }
}

function assertInteger(name, value, minimum = undefined) {
  if (!Number.isInteger(value) || (minimum !== undefined && value < minimum)) {
    const suffix = minimum === undefined ? 'an integer' : `an integer >= ${minimum}`;
    throw new Error(`renderSnapshotToSvgV1: \`${name}\` must be ${suffix}`);
  }
}

function assertNonEmptyString(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`renderSnapshotToSvgV1: \`${name}\` must be a non-empty string`);
  }
}

function escapeXmlAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&apos;');
}

function validateRenderSnapshot(renderSnapshot) {
  assertObject(renderSnapshot, 'renderSnapshot');
  assertInteger('renderSnapshot.renderSnapshotVersion', renderSnapshot.renderSnapshotVersion, 1);
  if (renderSnapshot.renderSnapshotVersion !== 1) {
    throw new Error('renderSnapshotToSvgV1: `renderSnapshot.renderSnapshotVersion` must be exactly 1');
  }

  assertNonEmptyString('renderSnapshot.scene', renderSnapshot.scene);
  assertInteger('renderSnapshot.tick', renderSnapshot.tick, 0);
  assertObject(renderSnapshot.viewport, 'renderSnapshot.viewport');
  assertInteger('renderSnapshot.viewport.width', renderSnapshot.viewport.width, 1);
  assertInteger('renderSnapshot.viewport.height', renderSnapshot.viewport.height, 1);

  if (!Array.isArray(renderSnapshot.drawCalls)) {
    throw new Error('renderSnapshotToSvgV1: `renderSnapshot.drawCalls` must be an array');
  }
}

function validateCommonDrawCall(drawCall, index) {
  assertObject(drawCall, `renderSnapshot.drawCalls[${index}]`);
  assertNonEmptyString(`renderSnapshot.drawCalls[${index}].id`, drawCall.id);
  assertInteger(`renderSnapshot.drawCalls[${index}].x`, drawCall.x);
  assertInteger(`renderSnapshot.drawCalls[${index}].y`, drawCall.y);
  assertInteger(`renderSnapshot.drawCalls[${index}].width`, drawCall.width, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].height`, drawCall.height, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].layer`, drawCall.layer);
}

function serializeRect(drawCall, index) {
  validateCommonDrawCall(drawCall, index);
  if (drawCall.kind !== 'rect') {
    throw new Error(`renderSnapshotToSvgV1: drawCalls[${index}].kind must be \`rect\` or \`sprite\``);
  }

  return `  <rect id="${escapeXmlAttribute(drawCall.id)}" data-layer="${drawCall.layer}" x="${drawCall.x}" y="${drawCall.y}" width="${drawCall.width}" height="${drawCall.height}" />`;
}

function serializeSprite(drawCall, index) {
  validateCommonDrawCall(drawCall, index);
  if (drawCall.kind !== 'sprite') {
    throw new Error(`renderSnapshotToSvgV1: drawCalls[${index}].kind must be \`rect\` or \`sprite\``);
  }

  assertNonEmptyString(`renderSnapshot.drawCalls[${index}].assetId`, drawCall.assetId);

  return `  <rect id="${escapeXmlAttribute(drawCall.id)}" data-asset-id="${escapeXmlAttribute(drawCall.assetId)}" data-kind="sprite" data-layer="${drawCall.layer}" x="${drawCall.x}" y="${drawCall.y}" width="${drawCall.width}" height="${drawCall.height}" />`;
}

function serializeDrawCall(drawCall, index) {
  if (drawCall.kind === 'rect') {
    return serializeRect(drawCall, index);
  }

  if (drawCall.kind === 'sprite') {
    return serializeSprite(drawCall, index);
  }

  throw new Error(`renderSnapshotToSvgV1: drawCalls[${index}].kind must be \`rect\` or \`sprite\``);
}

export function renderSnapshotToSvgV1(renderSnapshot) {
  validateRenderSnapshot(renderSnapshot);

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="${RENDER_SVG_VERSION}" data-scene="${escapeXmlAttribute(renderSnapshot.scene)}" data-tick="${renderSnapshot.tick}" width="${renderSnapshot.viewport.width}" height="${renderSnapshot.viewport.height}" viewBox="0 0 ${renderSnapshot.viewport.width} ${renderSnapshot.viewport.height}">`,
    ...renderSnapshot.drawCalls.map(serializeDrawCall),
    '</svg>'
  ];

  return `${lines.join('\n')}\n`;
}
