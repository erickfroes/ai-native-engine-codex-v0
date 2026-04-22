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
  }
];
