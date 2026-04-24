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
    name: 'describe_scene',
    title: 'Describe Scene',
    description: 'Load a scene and return a compact entity/components description.',
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
    name: 'replay_first_loop',
    title: 'Replay First Loop',
    description: 'Build deterministic replay frames from first-loop simulation.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Scene path, absolute or relative to repository root.'
        },
        ticks: {
          type: 'integer',
          minimum: 1
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'simulate_first_loop',
    title: 'Simulate First Loop',
    description: 'Run the deterministic first system loop for a scene and return the report.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        },
        ticks: {
          type: 'integer',
          minimum: 1
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'verify_replay_determinism',
    title: 'Verify Replay Determinism',
    description: 'Run replay multiple times and verify digest stability.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Scene path, absolute or relative to repository root.'
        },
        ticks: {
          type: 'integer',
          minimum: 1
        },
        runs: {
          type: 'integer',
          minimum: 1
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'playback_replay_artifact',
    title: 'Playback Replay Artifact',
    description: 'Validate a stored replay artifact against current runtime replay output.',
    inputSchema: {
      type: 'object',
      required: ['replayPath'],
      properties: {
        replayPath: {
          type: 'string',
          description: 'Replay artifact path, absolute or relative to repository root.'
        },
        scenePath: {
          type: 'string',
          description: 'Optional scene path override, absolute or relative to repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'benchmark_first_loop',
    title: 'Benchmark First Loop',
    description: 'Measure deterministic first-loop runtime metrics for a scene.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Scene path, absolute or relative to repository root.'
        },
        ticks: {
          type: 'integer',
          minimum: 1
        },
        runs: {
          type: 'integer',
          minimum: 1
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'validate_scene_assets',
    title: 'Validate Scene Assets',
    description: 'Validate scene assetRefs against an asset manifest file.',
    inputSchema: {
      type: 'object',
      required: ['path', 'manifestPath'],
      properties: {
        path: {
          type: 'string',
          description: 'Scene path, absolute or relative to repository root.'
        },
        manifestPath: {
          type: 'string',
          description: 'Asset manifest path, absolute or relative to repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'validate_input',
    title: 'Validate Input',
    description: 'Validate input bindings JSON file against input schema.',
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
    description: 'Validate a savegame JSON file against save schema.',
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
    name: 'inspect_world',
    title: 'Inspect ECS World',
    description: 'Load a scene and return ECS-oriented world summary.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        },
        componentKind: {
          type: 'string',
          description: 'Optional component kind filter.'
        },
        systemName: {
          type: 'string',
          description: 'Optional scene system filter.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'inspect_scene_hierarchy',
    title: 'Inspect Scene Hierarchy',
    description: 'Build a deterministic hierarchy tree from scene entity ids.',
    inputSchema: {
      type: 'object',
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path or path relative to the repository root.'
        },
        componentKind: {
          type: 'string',
          description: 'Optional component kind filter.'
        },
        systemName: {
          type: 'string',
          description: 'Optional scene system filter.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'validate_ui',
    title: 'Validate UI Layout',
    description: 'Validate UI layout JSON against UI schema.',
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
    name: 'validate_render',
    title: 'Validate Render Profile',
    description: 'Validate render profile JSON against render schema.',
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
    name: 'validate_network',
    title: 'Validate Network Message',
    description: 'Validate network message JSON against net message schema.',
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
    name: 'diff_network_snapshots',
    title: 'Diff Network Snapshots',
    description: 'Diff two network snapshot message files and report structural changes.',
    inputSchema: {
      type: 'object',
      required: ['beforePath', 'afterPath'],
      properties: {
        beforePath: {
          type: 'string',
          description: 'Snapshot A path, absolute or relative to repository root.'
        },
        afterPath: {
          type: 'string',
          description: 'Snapshot B path, absolute or relative to repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'validate_network_sequence',
    title: 'Validate Network Sequence',
    description: 'Validate ordered server snapshot messages for version/opcode/tick consistency.',
    inputSchema: {
      type: 'object',
      required: ['beforePath', 'afterPath'],
      properties: {
        beforePath: {
          type: 'string',
          description: 'Snapshot A path, absolute or relative to repository root.'
        },
        afterPath: {
          type: 'string',
          description: 'Snapshot B path, absolute or relative to repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'simulate_network_replication',
    title: 'Simulate Network Replication',
    description: 'Simulate ordered replication snapshots and build a timeline summary.',
    inputSchema: {
      type: 'object',
      required: ['paths'],
      properties: {
        paths: {
          type: 'array',
          minItems: 2,
          items: {
            type: 'string'
          },
          description: 'Ordered list of snapshot paths, absolute or relative to repository root.'
        }
      },
      additionalProperties: false
    }
  },
  {
    name: 'validate_prefab',
    title: 'Validate Prefab',
    description: 'Validate a prefab JSON file against repo schemas.',
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
  }
];
