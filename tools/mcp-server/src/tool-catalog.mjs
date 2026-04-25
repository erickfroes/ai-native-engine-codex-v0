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
    name: 'validate_input_intent',
    title: 'Validate Input Intent',
    description: 'Validate an Input Intent v1 JSON file against the runtime contract.',
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
    name: 'save_state_snapshot',
    title: 'Save State Snapshot',
    description: 'Simulate state ticks for a scene and write a minimal savegame v1 envelope plus snapshot payload.',
    inputSchema: {
      type: 'object',
      required: ['path', 'ticks', 'outDir'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        },
        ticks: {
          type: 'integer',
          description: 'Number of state simulation ticks to execute before saving the final snapshot.'
        },
        seed: {
          type: 'integer',
          description: 'Optional deterministic seed override.'
        },
        outDir: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root where save files will be written.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'load_save',
    title: 'Load Save',
    description: 'Load a minimal savegame v1 envelope, verify checksum, and return the referenced State Snapshot v1 payload.',
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
    name: 'run_loop',
    title: 'Run Loop',
    description: 'Run headless minimal loop for a scene and return deterministic loop report.',
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
          description: 'Number of ticks to execute in the minimal loop.'
        },
        seed: {
          type: 'integer',
          description: 'Optional deterministic seed override.'
        },
        inputIntentPath: {
          type: 'string',
          description: 'Optional repository-relative or absolute path to an Input Intent v1 JSON file.'
        },
        trace: {
          type: 'boolean',
          description: 'Optional diagnostics flag. When true, returns LoopTrace envelope.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'plan_loop',
    title: 'Plan Loop',
    description: 'Plan headless loop execution without running handlers and return ExecutionPlan v1.',
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
          description: 'Number of ticks to plan.'
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
  },
  {
    name: 'inspect_state',
    title: 'Inspect State',
    description: 'Build State Snapshot v1 from Scene Document v1 without running loop handlers.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
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
    name: 'simulate_state',
    title: 'Simulate State',
    description: 'Run opt-in State Simulation v1 processors over a scene-derived state model.',
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
          description: 'Number of state simulation ticks to execute.'
        },
        seed: {
          type: 'integer',
          description: 'Optional deterministic seed override.'
        },
        processors: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional ordered list of state processor names.'
        },
        trace: {
          type: 'boolean',
          description: 'When true, returns report plus mutationTrace envelope.'
        }
      },
      additionalProperties: false
    }
  }
];
