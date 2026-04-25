function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function appendPath(basePath, nextKey) {
  if (typeof nextKey === 'number') {
    return `${basePath}[${nextKey}]`;
  }

  if (basePath === '$') {
    return `$.${nextKey}`;
  }

  return `${basePath}.${nextKey}`;
}

function resolveRef(schema, registry) {
  if (!schema.$ref) {
    return schema;
  }

  const refKey = schema.$ref.replace(/^\.\//, '');
  const refEntry = registry[refKey];
  if (!refEntry) {
    throw new Error(`Schema reference not found: ${schema.$ref}`);
  }
  return refEntry.schema;
}

function pushError(errors, path, message) {
  errors.push({ path, message });
}

function validateString(value, schema, valuePath, errors) {
  if (typeof value !== 'string') {
    pushError(errors, valuePath, 'expected string');
    return;
  }

  if (value.trim().length === 0) {
    pushError(errors, valuePath, 'must not be blank');
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    pushError(errors, valuePath, `must be one of: ${schema.enum.join(', ')}`);
  }
}

function validateInteger(value, schema, valuePath, errors) {
  if (!Number.isInteger(value)) {
    pushError(errors, valuePath, 'expected integer');
    return;
  }

  if (typeof schema.minimum === 'number' && value < schema.minimum) {
    pushError(errors, valuePath, `must be >= ${schema.minimum}`);
  }

  if (typeof schema.maximum === 'number' && value > schema.maximum) {
    pushError(errors, valuePath, `must be <= ${schema.maximum}`);
  }
}

function validateBoolean(value, _schema, valuePath, errors) {
  if (typeof value !== 'boolean') {
    pushError(errors, valuePath, 'expected boolean');
  }
}

function validateArray(value, schema, registry, valuePath, errors) {
  if (!Array.isArray(value)) {
    pushError(errors, valuePath, 'expected array');
    return;
  }

  if (schema.minItems !== undefined && value.length < schema.minItems) {
    pushError(errors, valuePath, `must contain at least ${schema.minItems} item(s)`);
  }

  if (schema.items) {
    value.forEach((item, index) => {
      validateWithSchema(item, schema.items, registry, appendPath(valuePath, index), errors);
    });
  }
}

function validateObject(value, schema, registry, valuePath, errors) {
  if (!isPlainObject(value)) {
    pushError(errors, valuePath, 'expected object');
    return;
  }

  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  for (const key of required) {
    if (!(key in value)) {
      pushError(errors, appendPath(valuePath, key), 'is required');
    }
  }

  for (const [key, childSchema] of Object.entries(properties)) {
    if (key in value) {
      validateWithSchema(value[key], childSchema, registry, appendPath(valuePath, key), errors);
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!(key in properties)) {
        pushError(errors, appendPath(valuePath, key), 'is not allowed by schema');
      }
    }
  }
}

export function validateWithSchema(value, rawSchema, registry, valuePath = '$', errors = []) {
  const schema = resolveRef(rawSchema, registry);

  if (Array.isArray(schema.enum)) {
    if (!schema.enum.includes(value)) {
      pushError(errors, valuePath, `must be one of: ${schema.enum.join(', ')}`);
    }
    return errors;
  }

  switch (schema.type) {
    case 'object':
      validateObject(value, schema, registry, valuePath, errors);
      break;
    case 'array':
      validateArray(value, schema, registry, valuePath, errors);
      break;
    case 'string':
      validateString(value, schema, valuePath, errors);
      break;
    case 'integer':
      validateInteger(value, schema, valuePath, errors);
      break;
    case 'boolean':
      validateBoolean(value, schema, valuePath, errors);
      break;
    default:
      break;
  }

  return errors;
}
