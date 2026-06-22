import path from 'node:path';

import { validateSceneFile } from './validate-scene.mjs';

export const SCENE_TRANSITION_REPORT_VERSION = 1;

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`buildSceneTransitionReportV1: \`${label}\` must be a non-empty string`);
  }
}

function assertInput(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('buildSceneTransitionReportV1: `input` must be an object');
  }

  assertNonEmptyString(input.fromPath, 'fromPath');
  assertNonEmptyString(input.toPath, 'toPath');
}

function summarizeEndpoint(summary) {
  return {
    name: summary.name,
    entityCount: summary.entityCount,
    componentCount: summary.componentCount,
    replicatedComponentCount: summary.replicatedComponentCount,
    systemCount: summary.systemCount,
    assetRefCount: summary.assetRefCount,
    systems: [...summary.systems],
    assetRefs: [...summary.assetRefs]
  };
}

function prefixMessages(endpoint, messages) {
  return messages.map((message) => ({
    endpoint,
    path: message.path,
    message: message.message
  }));
}

async function validateEndpoint(endpoint, scenePath) {
  const fallbackPath = path.resolve(scenePath);

  try {
    const validation = await validateSceneFile(scenePath);
    return {
      path: validation.absolutePath,
      ok: validation.ok,
      scene: validation.summary.name,
      summary: summarizeEndpoint(validation.summary),
      errors: [...validation.errors],
      warnings: [...validation.warnings]
    };
  } catch (error) {
    return {
      path: fallbackPath,
      ok: false,
      scene: null,
      summary: null,
      errors: [
        {
          path: '$',
          message: error.message
        }
      ],
      warnings: []
    };
  }
}

export async function buildSceneTransitionReportV1(input) {
  assertInput(input);

  const [from, to] = await Promise.all([
    validateEndpoint('from', input.fromPath),
    validateEndpoint('to', input.toPath)
  ]);
  const errors = [
    ...prefixMessages('from', from.errors),
    ...prefixMessages('to', to.errors)
  ];
  const warnings = [
    ...prefixMessages('from', from.warnings),
    ...prefixMessages('to', to.warnings)
  ];

  if (from.path === to.path) {
    warnings.push({
      endpoint: 'transition',
      path: '$',
      message: 'fromPath and toPath resolve to the same scene file'
    });
  }

  return {
    sceneTransitionReportVersion: SCENE_TRANSITION_REPORT_VERSION,
    ok: errors.length === 0,
    from,
    to,
    errors,
    warnings
  };
}
