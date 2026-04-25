# MCP server do engine

Servidor MCP local via stdio.

## Tools atuais

- `validate_scene`
- `validate_input_intent`
- `keyboard_to_input_intent`
- `validate_save`
- `emit_world_snapshot`
- `plan_loop`
- `run_loop`
- `run_replay`
- `run_replay_artifact`
- `inspect_state`
- `simulate_state`

## Execução manual

```bash
node ./tools/mcp-server/src/index.mjs
```

## Papel da V0

Expor validação e inspeção headless para o Codex sem depender de GUI.
