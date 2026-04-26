# V0 Headless Test Matrix

## Objetivo

Registrar as superficies principais da V0 headless e onde a paridade entre CLI, MCP e runtime ja esta sendo validada.

## Matriz principal

| Fluxo | CLI | MCP | Suite relevante |
| --- | --- | --- | --- |
| validacao de cena | `validate-scene` | `validate_scene` | `engine/runtime/test/scene-validation-report-cross-interface.integration.test.mjs` |
| validacao de input intent | `validate-input-intent` | `validate_input_intent` | `engine/runtime/test/input-intent-cross-interface.integration.test.mjs` |
| teclado para input intent | `keyboard-to-input-intent` | `keyboard_to_input_intent` | `tools/mcp-server/test/mcp-server.test.mjs` |
| world snapshot | `emit-world-snapshot` | `emit_world_snapshot` | `engine/runtime/test/world-snapshot.integration.test.mjs` + `tools/mcp-server/test/mcp-server.test.mjs` |
| render snapshot | `render-snapshot` | `render_snapshot` | `engine/runtime/test/render-snapshot-cross-interface.integration.test.mjs` |
| render svg | `render-svg` | `render_svg` | `engine/runtime/test/render-svg-cross-interface.integration.test.mjs` |
| loop headless | `run-loop` | `run_loop` | `engine/runtime/test/loop-cross-interface.integration.test.mjs` |
| loop com keyboard script | `run-loop --keyboard-script` | `run_loop` com `keyboardScriptPath` | `engine/runtime/test/keyboard-input-script-cross-interface.integration.test.mjs` |
| execution plan | `plan-loop` | `plan_loop` | `engine/runtime/test/execution-plan-cross-interface.integration.test.mjs` |
| replay CI | `run-replay` | `run_replay` | `engine/runtime/test/replay-ci-cross-interface.integration.test.mjs` |
| replay artifact | `run-replay-artifact` | `run_replay_artifact` | `engine/runtime/test/replay-cross-interface.integration.test.mjs` |
| inspect state | `inspect-state` | `inspect_state` | `engine/runtime/test/state-snapshot-v1.integration.test.mjs` |
| simulate state | `simulate-state` | `simulate_state` | `engine/runtime/test/state-simulation-v1.integration.test.mjs` |
| save/load minimo | `save-state` / `load-save` | `save_state_snapshot` / `load_save` | `engine/runtime/test/save-load-cross-interface.integration.test.mjs` |
| validate save | `validate-save` | `validate_save` | `engine/runtime/test/validate-save-cross-interface.integration.test.mjs` |
| demo html estatica | `render-svg-demo` | sem tool dedicada nesta V0 | `engine/runtime/test/render-svg-demo-html-cross-check.integration.test.mjs` |

## Comandos de validacao obrigatorios

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Observacoes

- `render-svg-demo` e propositalmente um fluxo de runtime/CLI nesta Meta 1.
- `run_loop` concentra os caminhos headless opt-in de `inputIntentPath`, `keyboardScriptPath` e `trace`.
- Quando uma interface nao existe nesta V0, a ausencia deve permanecer explicita na documentacao em vez de ser inferida.
