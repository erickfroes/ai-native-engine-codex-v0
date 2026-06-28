# MCP server do engine

Servidor MCP local via stdio.

## Tools atuais

- `validate_scene`
- `validate_asset_manifest`
- `inspect_atlas_material_manifest`
- `validate_input_intent`
- `validate_prefab`
- `keyboard_to_input_intent`
- `validate_save`
- `save_state_snapshot`
- `load_save`
- `emit_world_snapshot`
- `inspect_scene_transition`
- `inspect_scene_composition`
- `render_snapshot`
- `render_svg`
- `inspect_visual_regression_baseline`
- `render_canvas_demo`
- `render_browser_demo`
- `export_html_game`
- `export_portable_html_game`
- `plan_loop`
- `run_loop`
- `run_replay`
- `run_replay_artifact`
- `inspect_state`
- `simulate_state`
- `inspect_collision_bounds`
- `inspect_collision_overlaps`
- `inspect_tile_collision`
- `inspect_pathfinding_grid`
- `inspect_prefab_usage`
- `inspect_prefab_usage_v2`
- `inspect_movement_blocking`
- `inspect_audio_lite`
- `inspect_ui_system`
- `inspect_ui_navigation_focus`
- `inspect_sprite_animation`

## Execucao manual

```bash
node ./tools/mcp-server/src/index.mjs
```

## Papel atual

Expor validacao, inspecao headless, render/export visual e diagnosticos V1/V2 incrementais para o Codex sem depender de GUI. `validate_scene` permanece o preflight minimo de `SceneValidationReport v1` para leitura/JSON e systems conhecidos; consumidores por path que precisam de schema, invariantes e prefab usam a validacao estrita interna antes de render/export/diagnosticos. `validate_asset_manifest` expoe `AssetManifestValidationReport v1` para diagnosticar manifestos diretamente antes dos consumidores visuais. `inspect_atlas_material_manifest` expoe o report atlas/material ancorado em `Asset Manifest v1`; `render_browser_demo` e `export_portable_html_game` aceitam `atlasMaterialManifestPath` para consumo sprite-only opt-in por `visual.sprite.fields.atlasBindingId`. `validate_prefab` e `inspect_prefab_usage`/`inspect_prefab_usage_v2` cobrem a trilha declarativa de prefab. `inspect_scene_transition` expoe `SceneTransitionReport v1` para diagnosticar uma troca explicita entre dois paths de cena validos, sem executar loop, save ou render. `inspect_scene_composition` expoe `Scene Composition Manifest v1` para validar um manifesto externo com `entryScene` e refs explicitas para cenas validas, tambem sem executar loop, save ou render. `inspect_pathfinding_grid` expoe `PathfindingGridReport v1` para diagnosticar ocupacao de grids derivados de `tile.layer` e `collision.bounds`, sem route solving, loop, save ou render. Audio Lite v1 aparece como report deterministico via `inspect_audio_lite` e como opt-in em `render_browser_demo`/`export_html_game`; UI System v1 aparece como report deterministico via `inspect_ui_system` e como overlay visual opt-in em `render_browser_demo`/`export_html_game`; UI Navigation/Focus Lite v1 aparece como report deterministico via `inspect_ui_navigation_focus`, sem consumo visual neste slice; Sprite Animation v1 aparece como report deterministico via `inspect_sprite_animation` e como animacao visual opt-in em `render_browser_demo`; `inspect_visual_regression_baseline` expoe um baseline visual estrutural por hashes de `RenderSnapshot v1` e `Render SVG v1`; Portable HTML Export v2 aparece em `export_portable_html_game`.
