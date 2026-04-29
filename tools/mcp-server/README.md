# MCP server do engine

Servidor MCP local via stdio.

## Tools atuais

- `validate_scene`
- `validate_input_intent`
- `keyboard_to_input_intent`
- `validate_save`
- `save_state_snapshot`
- `load_save`
- `emit_world_snapshot`
- `render_snapshot`
- `render_svg`
- `render_canvas_demo`
- `render_browser_demo`
- `export_html_game`
- `plan_loop`
- `run_loop`
- `run_replay`
- `run_replay_artifact`
- `inspect_state`
- `simulate_state`
- `inspect_collision_bounds`
- `inspect_collision_overlaps`
- `inspect_tile_collision`
- `inspect_movement_blocking`

## Execucao manual

```bash
node ./tools/mcp-server/src/index.mjs
```

## Papel atual

Expor validacao, inspecao headless, render/export visual e diagnosticos V1 para o Codex sem depender de GUI.
