# Game Templates v1

## Objetivo

Fornecer exemplos copiaveis para V1 Small 2D usando apenas capacidades ja existentes da engine.

Game Templates v1 nao e um template engine, nao e prefab system e nao cria novo runtime. Cada template e um diretorio pequeno com uma `scene.json`, intents de exemplo e um README curto para copiar, validar, adaptar e exportar.

## Templates

### `templates/top-down-basic`

Cena top-down pequena com:

- `player.hero` controlavel;
- `tile.layer` com sala e obstaculos solidos;
- `collision.bounds` solido no player;
- `camera.viewport`;
- `visual.sprite` com fallback retangular deterministico;
- movimento para direita bloqueado por tile solido;
- movimento para baixo livre.

### `templates/side-view-blocking-basic`

Cena lateral pequena com:

- `player.hero` controlavel;
- `tile.layer` com piso visual e obstaculo solido;
- `collision.bounds` solido no player;
- `camera.viewport`;
- `visual.sprite` com fallback retangular deterministico;
- movimento para direita bloqueado por tile solido;
- movimento para baixo livre.

Este template nao e um platformer real. Ele nao tem gravidade, jump, fisica, character controller ou resolucao complexa.

## Como validar

Os comandos abaixo assumem execucao na raiz do repositorio.

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./templates/top-down-basic/scene.json --json
node ./engine/runtime/src/cli.mjs validate-scene ./templates/side-view-blocking-basic/scene.json --json
```

O gate automatizado dos templates tambem roda `loadSceneFile`, valida os intents locais e cobre render/diagnosticos/export via `engine/runtime/test/game-templates-v1.test.mjs`.

## Como gerar Browser Demo

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./templates/top-down-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/top-down-basic.html --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./templates/side-view-blocking-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/side-view-blocking-basic.html --json
```

## Como exportar HTML

```bash
node ./engine/runtime/src/cli.mjs export-html-game ./templates/top-down-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/top-down-basic-export.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./templates/side-view-blocking-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/side-view-blocking-basic-export.html --json
```

## MCP

As mesmas cenas funcionam com `render_browser_demo`, `export_html_game` e `inspect_movement_blocking`:

```json
{
  "name": "render_browser_demo",
  "arguments": {
    "path": "./templates/top-down-basic/scene.json",
    "movementBlocking": true,
    "gameplayHud": true,
    "playableSaveLoad": true
  }
}
```

```json
{
  "name": "export_html_game",
  "arguments": {
    "scenePath": "./templates/top-down-basic/scene.json",
    "outputPath": "./tmp/top-down-basic-export.html",
    "movementBlocking": true,
    "gameplayHud": true,
    "playableSaveLoad": true
  }
}
```

## Intents de exemplo

Cada template inclui:

- `input/move-right.intent.json`: caminho bloqueado por tile solido.
- `input/move-down.intent.json`: caminho livre.

Eles podem ser usados com:

```bash
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./templates/top-down-basic/scene.json --input-intent ./templates/top-down-basic/input/move-right.intent.json --json
```

## Compatibilidade

- Reutiliza `Scene Document v1`.
- Reutiliza `InputIntent v1`.
- Reutiliza `tile.layer`, `collision.bounds`, `camera.viewport` e `visual.sprite`.
- Reutiliza Browser Playable Demo v1, HUD Lite, Playable Save/Load Lite e Simple HTML Export v1.
- Paridade MCP validada por `validate_scene`, `render_browser_demo`, `inspect_movement_blocking` e `export_html_game`.
- Nao altera `RenderSnapshot v1`.
- Nao altera `MovementBlockingReport v1`.
- Nao altera `TileCollisionReport v1`.
- Nao altera Browser Demo Local State v1.

## Budgets v1

- `top-down-basic` baseline atual: 50 drawCalls, 25 tiles solidos/blockers e 30597 B no export HTML com todos os opt-ins.
- `top-down-basic` hard ceiling: ate 64 drawCalls, ate 32 tiles solidos/blockers e ate 32000 B no export HTML com todos os opt-ins.
- `side-view-blocking-basic` baseline atual: 15 drawCalls, 11 tiles solidos/blockers e 26774 B no export HTML com todos os opt-ins.
- `side-view-blocking-basic` hard ceiling: ate 32 drawCalls, ate 16 tiles solidos/blockers e ate 32000 B no export HTML com todos os opt-ins.
- Os templates usam fallback visual deterministico; sprite real continua dependendo dos fluxos opt-in de Asset Manifest ja existentes e fica fora deste pacote.
- A Browser Demo ainda redesenha via `requestAnimationFrame`; por isso os mapas devem permanecer pequenos em V1.
- Cada tile nao vazio vira 1 drawCall. Cada tile `solid: true` tambem vira blocker serializado para o input local da Browser Demo.

## Fora de escopo

- template engine com placeholders ou geracao magica;
- prefab system;
- editor;
- UI system completo;
- fisica;
- gravidade;
- jump/platformer real;
- pathfinding;
- combate;
- inventario;
- audio ou animation;
- pipeline pesado de assets;
- bundler, servidor ou build pipeline V2.

## Guia de criacao

O V1 Small 2D Game Creation Guide / Codex package esta concluido como fluxo Codex-first para criar jogos pequenos a partir destes templates:

- `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`
- `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`
- `docs/codex-packages/V1_SMALL_2D_CREATE_GAME_PACKAGE.md`

O V1 Small 2D Release Checkpoint tambem esta concluido:

- `docs/V1_SMALL_2D_RELEASE_CHECKPOINT.md`
- `docs/V1_SMALL_2D_CAPABILITY_MATRIX.md`
- `docs/V1_SMALL_2D_RELEASE_VALIDATION.md`

## Proximo pacote recomendado

`codex/audio-lite-v1`.
