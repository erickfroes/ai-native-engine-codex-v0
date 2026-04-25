import { createHash } from 'node:crypto';

function normalizeCanonicalJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      const normalizedItem = normalizeCanonicalJsonValue(item);
      return normalizedItem === undefined ? null : normalizedItem;
    });
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'object') {
    const normalizedObject = {};
    for (const key of Object.keys(value).sort()) {
      const normalizedValue = normalizeCanonicalJsonValue(value[key]);
      if (normalizedValue !== undefined) {
        normalizedObject[key] = normalizedValue;
      }
    }
    return normalizedObject;
  }

  if (value === undefined) {
    return undefined;
  }

  throw new TypeError(`unsupported value type for canonical JSON: ${typeof value}`);
}

export function canonicalJSONStringify(value) {
  const normalizedValue = normalizeCanonicalJsonValue(value);
  const serialized = JSON.stringify(normalizedValue);

  if (serialized === undefined) {
    throw new TypeError('unsupported root value for canonical JSON');
  }

  return serialized;
}

export function sha256Hex(value) {
  const serialized = typeof value === 'string' ? value : canonicalJSONStringify(value);
  return createHash('sha256').update(serialized).digest('hex');
}

export function createSha256Checksum(value) {
  return `sha256:${sha256Hex(value)}`;
}
