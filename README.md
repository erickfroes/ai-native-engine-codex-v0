# AI-Native Engine for Codex - V1 Small 2D

Este repositorio fechou as Metas 1 e 2 e possui um slice V1 Small 2D release-checkpointed para gameplay basico, export HTML simples e templates copiar-e-adaptar.

A simulacao canonica continua headless. A camada visual atual transforma cenas validadas em snapshots e demos HTML autocontidas para inspecao, smoke e automacao com Codex.

## Roadmap progressivo

A engine agora segue um roadmap por versoes de produto:

- V1: jogos pequenos 2D;
- V2: jogos 2D/2.5D indie production;
- V3: 3D indie;
- V4: runtime/editor AA;
- V5/V6: caminho aspiracional para 3D AAA.

Leia:

- `ROADMAP.md` para a visao resumida;
- `docs/ENGINE_VERSION_ROADMAP.md` para a progressao completa;
- `docs/CODEX_SUBAGENT_STRATEGY.md` para a estrategia de Codex, MCP, skills e subagentes.

## O que o engine ja consegue fazer visualmente

- gerar `RenderSnapshot v1` deterministico a partir de uma cena;
- gerar `Render SVG v1` textual e deterministico;
- gerar `SVG Demo HTML v1` com SVG inline;
- gerar `Canvas2D Demo v1` com Canvas 2D nativo;
- gerar `Browser Playable Demo v1` autocontida com canvas focavel e input local;
- carregar imagens locais opcionais via `Asset Manifest v1` na browser demo, com fallback visual deterministico;
- usar `visual.sprite` para sprite declarativo com fallback `rect`;
- usar `tile.layer` para mapas declarativos pequenos expandidos em drawCalls;
- usar `camera.viewport` para aplicar offset `world - camera` nos drawCalls.

## Meta 3 - Gameplay Foundation release-checkpointed

A engine agora avancou para a fundacao de gameplay 2D:

- `collision.bounds` para declarar bounds retangulares;
- `CollisionBoundsReport v1` para inspecionar bounds;
- `CollisionOverlapReport v1` para detectar overlaps AABB;
- `MovementBlockingReport v1` para avaliar tentativas de movimento contra bounds solidos;
- `TileCollisionReport v1` para inspecionar tiles solidos declarados em `tile.layer`;
- blocking opt-in no `run-loop` e na Browser Playable Demo;
- Playable Save/Load Lite browser-local opt-in na Browser Playable Demo;
- Simple HTML Export v1 para gerar um arquivo HTML jogavel autocontido;
- Game Templates v1 com exemplos copiar-e-adaptar para top-down e side-view blocking;
- V1 Small 2D Game Creation Guide / Codex package para criar jogos pequenos por copia/adaptacao;
- V1 Small 2D Release Checkpoint para registrar capacidades, evidencias e validacao canonica;
- cena consolidada `v1-small-2d` para readiness da V1;
- CLI/MCP para inspecao de colisao, overlap, tile collision e blocking;
- testes cross-interface para os reports principais.

Importante: o bloqueio de movimento e tile collision continuam opt-in. O `run-loop` e a Browser Demo preservam o comportamento antigo quando a flag/opcao `movementBlocking` nao e fornecida.

## O que a Meta 2 fechou

- `engine/runtime/`: runtime, contratos internos e CLI;
- `tools/mcp-server/`: servidor MCP local via stdio;
- `scenes/`: cenas pequenas e reproduziveis;
- `fixtures/`: fixtures de input, save, assets e render;
- `schemas/` e `docs/schemas/`: contratos formais versionados;
- `docs/`: handoff, status, contratos e matrizes da Meta 2;
- paridade principal entre runtime, CLI e MCP para fluxos visuais automatizaveis.

## O que a Meta 2 nao cobria

- Pixi, Three, WebGL ou renderer real do engine;
- editor visual;
- servidor;
- pipeline pesado de assets;
- colisao;
- pathfinding;
- chunk streaming;
- animacao avancada;
- multiplayer real;
- captura/input runtime completo fora da Browser Playable Demo local.

A Meta 3 ja adiciona `collision.bounds`, blocking opt-in, Playable Save/Load Lite, Simple HTML Export v1, Game Templates v1, o V1 Small 2D Game Creation Guide / Codex package e o V1 Small 2D Release Checkpoint. O primeiro incremento pos-checkpoint inicia V2 de forma pequena com Audio Lite v1.

O proximo pacote recomendado e `codex/sprite-animation-v1`.

## Comandos CLI principais

- `validate-scene`: valida scene document + invariantes do runtime
- `validate-input-intent`: valida InputIntent v1
- `keyboard-to-input-intent`: traduz teclas declaradas para InputIntent v1
- `plan-loop`: planeja execucao sem rodar handlers
- `run-loop`: executa loop headless com suporte opt-in a input intent e keyboard script
- `run-replay` e `run-replay-artifact`: executam replay deterministico
- `inspect-state` e `simulate-state`: inspecao e simulacao opt-in de estado
- `inspect-collision-bounds`: inspeciona bounds de colisao
- `inspect-collision-overlaps`: detecta overlaps AABB
- `inspect-tile-collision`: inspeciona tiles solidos declarados em `tile.layer`
- `inspect-movement-blocking`: avalia tentativa de movimento contra colisao solida
- `inspect-audio-lite`: inspeciona clips e triggers declarativos de Audio Lite v1
- `save-state` e `load-save`: persistencia minima de State Snapshot v1
- `render-snapshot`: gera RenderSnapshot v1
- `render-svg`: gera SVG textual deterministico
- `render-svg-demo`: gera HTML estatico com SVG inline
- `render-canvas-demo`: gera HTML estatico com Canvas 2D
- `render-browser-demo`: gera HTML interativo minimo com Canvas 2D, teclado local, fallback de sprites, blocking local opt-in, HUD Lite opt-in, Playable Save/Load Lite opt-in e Audio Lite opt-in
- `export-html-game`: escreve um HTML jogavel autocontido com opcoes da Browser Demo, incluindo Audio Lite opt-in

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

Observacao: `render-svg-demo` e um fluxo de CLI/runtime. A Meta 2 nao define uma tool MCP dedicada para a demo HTML de SVG.

## Fluxo visual minimo

1. Validar a cena com `validate-scene` ou `validate_scene`.
2. Gerar o contrato visual com `render-snapshot` ou `render_snapshot`.
3. Serializar uma saida textual com `render-svg` ou `render_svg`.
4. Gerar demos HTML com `render-svg-demo`, `render-canvas-demo` ou `render-browser-demo`.
5. Usar `--asset-manifest` ou `assetManifestPath` apenas quando a cena declarar sprites locais.
6. Para entregar um arquivo jogavel simples, usar `export-html-game`.

## Exemplos minimos

```bash
# validar cena
node ./engine/runtime/src/cli.mjs validate-scene ./scenes/tutorial.scene.json --json

# executar loop headless
node ./engine/runtime/src/cli.mjs run-loop ./scenes/tutorial.scene.json --ticks 3 --seed 42 --json

# executar loop headless com blocking opt-in
node ./engine/runtime/src/cli.mjs run-loop ./engine/runtime/test/fixtures/movement-blocking-loop-blocked.scene.json --ticks 1 --movement-blocking --input-intent ./fixtures/input/move-player-right.intent.json --json

# gerar RenderSnapshot v1
node ./engine/runtime/src/cli.mjs render-snapshot ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --json

# gerar SVG deterministico
node ./engine/runtime/src/cli.mjs render-svg ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --json

# gerar demo HTML estatica com SVG inline
node ./engine/runtime/src/cli.mjs render-svg-demo ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --out ./tmp/tutorial-svg-demo.html --json

# gerar demo HTML estatica com Canvas 2D
node ./engine/runtime/src/cli.mjs render-canvas-demo ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --out ./tmp/tutorial-canvas-demo.html --json

# gerar Browser Playable Demo com input local
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --out ./tmp/tutorial-browser-demo.html --json

# gerar Browser Playable Demo com blocking local opt-in
node ./engine/runtime/src/cli.mjs render-browser-demo ./engine/runtime/test/fixtures/movement-blocking-tile-blocked.scene.json --movement-blocking --out ./tmp/tile-blocking-browser-demo.html --json

# gerar Browser Playable Demo da cena consolidada V1 small 2D com HUD Lite opt-in
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --gameplay-hud --movement-blocking --out ./tmp/v1-small-2d.html --json

# gerar Browser Playable Demo da cena consolidada com export/import local opt-in
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --gameplay-hud --movement-blocking --playable-save-load --out ./tmp/v1-small-2d-save-load.html --json

# gerar Browser Playable Demo com Audio Lite diagnostico opt-in
node ./engine/runtime/src/cli.mjs render-browser-demo ./engine/runtime/test/fixtures/audio-lite-sfx.scene.json --audio-lite --out ./tmp/audio-lite-browser-demo.html --json

# exportar um HTML jogavel simples da cena consolidada V1 small 2D
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --movement-blocking --gameplay-hud --playable-save-load --audio-lite --out ./tmp/v1-small-2d-export.html --json
```

## Validacao obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Estrutura rapida

- `README.md`: panorama atual da Meta 2 visual/interativa
- `docs/CODEX_HANDOFF.md`: orientacao curta para abrir e continuar no Codex
- `docs/STATUS.md`: status consolidado da Meta 3 / V1 Small 2D
- `docs/META2_VISUAL_TEST_MATRIX.md`: matriz runtime/CLI/MCP/testes visuais
- `docs/META2_VISUAL_INTERACTIVE_CHECKLIST.md`: checklist final da Meta 2
- `docs/V1_SMALL_2D_READINESS.md`: gate consolidado da V1 Small 2D
- `docs/V1_SMALL_2D_TEST_MATRIX.md`: matriz runtime/CLI/MCP/testes da cena consolidada
- `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`: formato local do Playable Save/Load Lite
- `docs/SIMPLE_HTML_EXPORT_V1.md`: contrato do export HTML jogavel simples
- `docs/GAME_TEMPLATES_V1.md`: templates V1 Small 2D copiar-e-adaptar
- `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`: fluxo Codex-first para criar um jogo pequeno 2D
- `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`: checklist de validacao para jogos criados a partir dos templates
- `docs/codex-packages/V1_SMALL_2D_CREATE_GAME_PACKAGE.md`: pacote de prompt para Codex
- `docs/V1_SMALL_2D_RELEASE_CHECKPOINT.md`: checkpoint de release da V1 Small 2D
- `docs/V1_SMALL_2D_CAPABILITY_MATRIX.md`: matriz de capacidades e evidencias da V1 Small 2D
- `docs/V1_SMALL_2D_RELEASE_VALIDATION.md`: sequencia canonica de validacao de release

## Primeira leitura recomendada

1. `README.md`
2. `docs/CODEX_HANDOFF.md`
3. `SPEC.md`
4. `docs/module-contracts.md`
5. `schemas/`
