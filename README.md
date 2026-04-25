# AI-Native Engine for Codex - V0 Headless

Este repositorio fecha a Meta 1 com uma V0 headless, deterministica e orientada a contrato.

O foco atual nao e um runtime visual real. O foco e permitir que Codex e automacoes operem com seguranca sobre:

- cenas validadas por schema + invariantes;
- loop headless interpretavel e deterministico;
- InputIntent v1 opt-in;
- KeyboardInputScript v1 opt-in;
- save/load v1 minimo;
- State Mutation Trace v1 opt-in;
- RenderSnapshot v1;
- Render SVG v1;
- demo HTML estatica derivada de SVG;
- paridade principal entre runtime, CLI e MCP.

## O que esta dentro da V0

- `engine/runtime/`: runtime, contratos internos e CLI headless
- `tools/mcp-server/`: servidor MCP local via stdio
- `scenes/`: cenas pequenas e reproduziveis
- `fixtures/`: fixtures de input, save e contratos de teste
- `schemas/` e `docs/schemas/`: contratos formais versionados
- `docs/`: handoff, status, contratos e checklists da Meta 1

## O que nao esta dentro da V0

- canvas, Pixi, Three, WebGL ou backend grafico real;
- editor visual;
- assets reais como pipeline de producao;
- captura real de teclado;
- multiplayer real;
- ECS completo.

## Comandos CLI principais

- `validate-scene`: valida scene document + invariantes do runtime
- `validate-input-intent`: valida InputIntent v1
- `keyboard-to-input-intent`: traduz teclas declaradas para InputIntent v1
- `plan-loop`: planeja execucao sem rodar handlers
- `run-loop`: executa loop headless com suporte opt-in a input intent e keyboard script
- `run-replay` e `run-replay-artifact`: executam replay deterministico
- `inspect-state` e `simulate-state`: inspecao e simulacao opt-in de estado
- `save-state` e `load-save`: persistencia minima de State Snapshot v1
- `render-snapshot`: gera RenderSnapshot v1
- `render-svg`: gera SVG textual deterministico
- `render-svg-demo`: gera HTML estatico com SVG inline

## Tools MCP principais

- `validate_scene`
- `validate_input_intent`
- `keyboard_to_input_intent`
- `validate_save`
- `save_state_snapshot`
- `load_save`
- `emit_world_snapshot`
- `render_snapshot`
- `render_svg`
- `plan_loop`
- `run_loop`
- `run_replay`
- `run_replay_artifact`
- `inspect_state`
- `simulate_state`

Observacao: `render-svg-demo` e um fluxo de CLI/runtime nesta V0. Ainda nao existe tool MCP dedicada para a demo HTML.

## Fluxo headless principal

1. Validar a cena com `validate-scene` ou `validate_scene`.
2. Planejar ou executar o loop com `plan-loop` / `run-loop`.
3. Injetar input opt-in via `--input-intent` ou `--keyboard-script` quando necessario.
4. Persistir ou inspecionar estado com `save-state`, `load-save`, `inspect-state` e `simulate-state`.
5. Gerar saidas de render headless com `render-snapshot`, `render-svg` e `render-svg-demo`.

## Exemplos minimos

```bash
# validar cena
node ./engine/runtime/src/cli.mjs validate-scene ./scenes/tutorial.scene.json --json

# executar loop headless
node ./engine/runtime/src/cli.mjs run-loop ./scenes/tutorial.scene.json --ticks 3 --seed 42 --json

# executar loop com KeyboardInputScript v1
node ./engine/runtime/src/cli.mjs run-loop ./scenes/tutorial.scene.json --ticks 2 --seed 10 --keyboard-script ./fixtures/input-script/valid.keyboard-input-script.json --json

# salvar e recarregar snapshot de estado
node ./engine/runtime/src/cli.mjs save-state ./scenes/tutorial.scene.json --ticks 2 --seed 42 --out ./tmp/save-demo --json
node ./engine/runtime/src/cli.mjs load-save ./tmp/save-demo/state-snapshot-v1.savegame.json --json

# gerar RenderSnapshot v1
node ./engine/runtime/src/cli.mjs render-snapshot ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --json

# gerar SVG deterministico
node ./engine/runtime/src/cli.mjs render-svg ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --json

# gerar demo HTML estatica com SVG inline
node ./engine/runtime/src/cli.mjs render-svg-demo ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --out ./tmp/tutorial-demo.html --json
```

## Validacao obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Estrutura rapida

- `README.md`: panorama atual da V0 headless
- `docs/CODEX_HANDOFF.md`: orientacao curta para abrir e continuar no Codex
- `docs/STATUS.md`: status consolidado da Meta 1
- `docs/V0_HEADLESS_TEST_MATRIX.md`: matriz CLI/MCP/cross-interface
- `docs/V0_HEADLESS_CHECKLIST.md`: checklist final da Meta 1

## Primeira leitura recomendada

1. `README.md`
2. `docs/CODEX_HANDOFF.md`
3. `SPEC.md`
4. `docs/module-contracts.md`
5. `schemas/`
