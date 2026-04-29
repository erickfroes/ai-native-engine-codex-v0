# V1 Small 2D Capability Matrix

Esta matriz liga capacidades V1 Small 2D a evidencia de docs, CLI/MCP e testes. Ela e uma matriz de release, nao um contrato runtime novo.

Audio Lite v1 e incremento pos-checkpoint e possui matriz propria em `docs/AUDIO_LITE_TEST_MATRIX.md`.

| Capacidade | Status | Docs | CLI | MCP | Testes | Observacoes |
| --- | --- | --- | --- | --- | --- | --- |
| Scene Document v1 | stable | `docs/SCENE_DOCUMENT_V1.md`, `docs/module-contracts.md` | `validate-scene`, `validate-all-scenes` | `validate_scene` | `scene-document-v1`, `scene-validation`, `scene-validation-report-cross-interface` | Entrada canonica de cenas pequenas. |
| Validate scenes | stable | `docs/SCENE_VALIDATION_REPORT_V1.md` | `validate-scene`, `validate-all-scenes` | `validate_scene` | `scene-validation-report-cross-interface`, `game-templates-v1` | `npm run validate:scenes` cobre `./scenes`. Prototipos fora de `./scenes` precisam gate explicito. |
| Runtime headless | stable | `docs/LOOP_REPORT_V1.md`, `docs/SYSTEM_REGISTRY_V1.md` | `run-loop`, `run-replay` | `run_loop`, `run_replay` | `minimal-system-loop`, `loop-cross-interface`, `replay-cross-interface` | Continua sendo a simulacao canonica. |
| Run-loop | stable | `docs/LOOP_REPORT_V1.md` | `run-loop` | `run_loop` | `loop-cross-interface`, `v1-small-2d-readiness-runtime-cli` | Sem flags, comportamento padrao preservado. |
| InputIntent v1 | stable | `docs/INPUT_INTENT_V1.md` | `validate-input-intent`, `keyboard-to-input-intent` | `validate_input_intent`, `keyboard_to_input_intent` | `input-intent-v1`, `cli-input-intent-validation` | Opt-in para input headless. |
| KeyboardInputScript v1 | stable | `docs/INPUT_INTENT_V1.md`, `docs/module-contracts.md` | `keyboard-to-input-intent` | `keyboard_to_input_intent` | `input-intent-v1`, `cli-input-intent-validation` | Traduz teclas declaradas para InputIntent v1. |
| RenderSnapshot v1 | stable | `docs/RENDER_SNAPSHOT_V1.md` | `render-snapshot` | `render_snapshot` | `render-snapshot-runtime`, `render-snapshot-cross-interface` | Fonte visual headless; nao inclui gameplay. |
| Browser Playable Demo v1 | opt-in | `docs/BROWSER_PLAYABLE_DEMO_V1.md` | `render-browser-demo` | `render_browser_demo` | `browser-playable-demo-runtime`, `browser-playable-demo-cross-interface` | HTML autocontido com input local. |
| Movement blocking opt-in | opt-in | `docs/MOVEMENT_BLOCKING_V1.md` | `inspect-movement-blocking`, `run-loop --movement-blocking`, `render-browser-demo --movement-blocking` | `inspect_movement_blocking`, `run_loop`, `render_browser_demo` | `movement-blocking-*`, `v1-small-2d-readiness-*` | Sem opt-in, loop e Browser Demo preservam movimento padrao. |
| Tile blocking | opt-in | `docs/TILE_COLLISION_V1.md`, `docs/MOVEMENT_BLOCKING_V1.md` | `inspect-tile-collision`, `run-loop --movement-blocking` | `inspect_tile_collision`, `run_loop` | `tile-collision-*`, `movement-blocking-*` | Tiles solidos podem bloquear apenas quando movementBlocking esta ativo. |
| HUD Lite | opt-in | `docs/BROWSER_PLAYABLE_DEMO_V1.md` | `render-browser-demo --gameplay-hud` | `render_browser_demo` com `gameplayHud: true` | `browser-playable-demo-runtime`, `cli-render-browser-demo` | HUD browser-local, nao UI system completo. |
| Playable Save/Load Lite | opt-in | `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md` | `render-browser-demo --playable-save-load` | `render_browser_demo` com `playableSaveLoad: true` | `browser-playable-demo-runtime`, `cli-render-browser-demo` | Export/import manual local no HTML, sem storage. |
| Simple HTML Export v1 | stable | `docs/SIMPLE_HTML_EXPORT_V1.md` | `export-html-game` | `export_html_game` | `simple-html-export-v1`, `game-templates-v1` | Escreve HTML jogavel autocontido; nao e bundler. |
| Game Templates v1 | done | `docs/GAME_TEMPLATES_V1.md`, `templates/*/README.md` | `validate-scene`, `render-browser-demo`, `export-html-game` | `validate_scene`, `render_browser_demo`, `export_html_game` | `game-templates-v1` | Exemplos copiar-e-adaptar, nao template engine. |
| Game Creation Guide | done | `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`, `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`, `docs/codex-packages/V1_SMALL_2D_CREATE_GAME_PACKAGE.md` | comandos explicitados no guia | tools MCP equivalentes listadas no guia | cobertura indireta por `game-templates-v1` e `v1-small-2d-readiness-*` | Workflow Codex-first para criar jogos pequenos sem sistema novo. |

## Evidencia De Release

- Cena canonica: `scenes/v1-small-2d.scene.json`.
- Templates: `templates/top-down-basic/scene.json` e `templates/side-view-blocking-basic/scene.json`.
- Intents canonicos: `fixtures/input/v1-small-2d-move-right.intent.json` e `fixtures/input/v1-small-2d-move-down.intent.json`.
- Suites principais: `engine/runtime/test/v1-small-2d-readiness-runtime-cli.test.mjs`, `engine/runtime/test/v1-small-2d-readiness-cross-interface.integration.test.mjs`, `engine/runtime/test/game-templates-v1.test.mjs`, `engine/runtime/test/simple-html-export-v1.test.mjs`, `tools/mcp-server/test/mcp-server.test.mjs`.

## Estados De Status

- `stable`: contrato ou comando ja faz parte da base v1 e deve preservar compatibilidade.
- `opt-in`: capacidade existe, mas nao muda comportamento padrao sem flag/opcao explicita.
- `diagnostic`: report ou ferramenta de inspecao sem autoridade de runtime por si so.
- `done`: pacote documental/workflow entregue, sem runtime proprio.
