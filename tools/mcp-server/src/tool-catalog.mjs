export const toolCatalog = [
  {
    name: 'validate_scene',
    title: 'Validate Scene',
    description: 'Validate a scene JSON file against repo schemas and runtime invariants.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'validate_save',
    title: 'Validate Save',
    description: 'Validate a savegame envelope JSON file against repository save schema.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'emit_world_snapshot',
    title: 'Emit World Snapshot',
    description: 'Load a scene and emit a deterministic world.snapshot message from replicated components.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'run_replay',
    title: 'Run Replay',
    description: 'Run deterministic replay for a scene and return the final snapshot.',
    inputSchema: {
      type: 'object',
      required: ['path', 'ticks'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        },
        ticks: {
          type: 'integer',
          description: 'Number of ticks to execute in deterministic replay.'
        },
        seed: {
          type: 'integer',
          description: 'Optional deterministic seed override.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'run_replay_artifact',
    title: 'Run Replay Artifact',
    description: 'Run deterministic replay for a scene and return the compact replay artifact.',
    inputSchema: {
      type: 'object',
      required: ['path', 'ticks'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        },
        ticks: {
          type: 'integer',
          description: 'Number of ticks to execute in deterministic replay.'
        },
        seed: {
          type: 'integer',
          description: 'Optional deterministic seed override.'
        }
      },
      additionalProperties: false
    }
  }
];
