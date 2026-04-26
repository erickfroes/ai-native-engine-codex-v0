export const SVG_DEMO_HTML_VERSION = 1;

function assertNonEmptyString(name, value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`renderSvgDemoHtmlV1: \`${name}\` must be a non-empty string`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeMetadataEntries(metadata) {
  if (metadata === undefined) {
    return [];
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('renderSvgDemoHtmlV1: `metadata` must be an object when provided');
  }

  return Object.entries(metadata)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => [escapeHtml(key), escapeHtml(value)]);
}

function renderMetadataBlock(entries) {
  if (entries.length === 0) {
    return '';
  }

  const lines = [
    '    <dl class="meta">'
  ];

  for (const [key, value] of entries) {
    lines.push('      <div>');
    lines.push(`        <dt>${key}</dt>`);
    lines.push(`        <dd>${value}</dd>`);
    lines.push('      </div>');
  }

  lines.push('    </dl>');
  return `${lines.join('\n')}\n`;
}

export function renderSvgDemoHtmlV1({ title, svg, metadata } = {}) {
  assertNonEmptyString('title', title);
  assertNonEmptyString('svg', svg);

  const metadataEntries = normalizeMetadataEntries(metadata);
  const metadataBlock = renderMetadataBlock(metadataEntries);

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${escapeHtml(title)}</title>`,
    '  <style>',
    '    :root { color-scheme: light; }',
    '    body { margin: 0; padding: 24px; font-family: "Courier New", monospace; background: #f4efe6; color: #201a13; }',
    '    main { display: grid; gap: 16px; max-width: 960px; margin: 0 auto; }',
    '    .frame { background: #fffdf8; border: 1px solid #d7cfc2; padding: 16px; overflow: auto; }',
    '    .meta { display: grid; gap: 8px; margin: 0; }',
    '    .meta div { display: grid; gap: 2px; }',
    '    .meta dt { font-weight: 700; }',
    '    .meta dd { margin: 0; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <main>',
    '    <header>',
    `      <h1>${escapeHtml(title)}</h1>`,
    '    </header>',
    '    <section class="frame">',
    svg.trimEnd(),
    '    </section>',
    metadataBlock.trimEnd(),
    '  </main>',
    '</body>',
    '</html>',
    ''
  ].filter((line, index, lines) => !(line === '' && lines[index - 1] === '')).join('\n');
}
