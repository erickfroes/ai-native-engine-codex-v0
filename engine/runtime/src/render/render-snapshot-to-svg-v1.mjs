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

function serializeRect(drawCall, index) {
  assertObject(drawCall, `renderSnapshot.drawCalls[${index}]`);
  if (drawCall.kind !== 'rect') {
    throw new Error(`renderSnapshotToSvgV1: drawCalls[${index}].kind must be \`rect\``);
  }

  assertNonEmptyString(`renderSnapshot.drawCalls[${index}].id`, drawCall.id);
  assertInteger(`renderSnapshot.drawCalls[${index}].x`, drawCall.x);
  assertInteger(`renderSnapshot.drawCalls[${index}].y`, drawCall.y);
  assertInteger(`renderSnapshot.drawCalls[${index}].width`, drawCall.width, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].height`, drawCall.height, 1);
  assertInteger(`renderSnapshot.drawCalls[${index}].layer`, drawCall.layer);

  return `  <rect id="${escapeXmlAttribute(drawCall.id)}" data-layer="${drawCall.layer}" x="${drawCall.x}" y="${drawCall.y}" width="${drawCall.width}" height="${drawCall.height}" />`;
}

export function renderSnapshotToSvgV1(renderSnapshot) {
  validateRenderSnapshot(renderSnapshot);

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" data-svg-version="${RENDER_SVG_VERSION}" data-scene="${escapeXmlAttribute(renderSnapshot.scene)}" data-tick="${renderSnapshot.tick}" width="${renderSnapshot.viewport.width}" height="${renderSnapshot.viewport.height}" viewBox="0 0 ${renderSnapshot.viewport.width} ${renderSnapshot.viewport.height}">`,
    ...renderSnapshot.drawCalls.map(serializeRect),
    '</svg>'
  ];

  return `${lines.join('\n')}\n`;
}
