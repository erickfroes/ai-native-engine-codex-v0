# V1 Small 2D Game Creation Checklist

Use este checklist para revisar um jogo criado a partir de `templates/top-down-basic` ou `templates/side-view-blocking-basic`.

## Estrutura

- O jogo foi criado por copia/adaptacao de template.
- `scene.json` continua em Scene Document v1.
- `systems` permanece pequeno e explicito.
- `player.hero` ou entidade controlavel equivalente existe.
- A cena contem `tile.layer`.
- A cena contem `camera.viewport`.
- A entidade controlavel tem `collision.bounds`.
- Existe fallback visual deterministico.
- Existem intents locais para caminho bloqueado e caminho livre.

## Validacao CLI

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./tmp/my-small-game/scene.json --json
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-down.intent.json --json
node ./engine/runtime/src/cli.mjs render-snapshot ./tmp/my-small-game/scene.json --json
```

## Blocking

```bash
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-down.intent.json --json
```

- O caminho bloqueado retorna `blocked: true`.
- O caminho livre retorna `blocked: false`.
- `blockingEntities` e deterministico quando ha bloqueio.
- Mudancas em `camera.viewport`, `tileWidth`, `tileHeight` ou layout de blockers foram verificadas em headless e Browser Demo.

## Browser Demo

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./tmp/my-small-game/scene.json --out ./tmp/my-small-game.html --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-full.html --json
```

- Sem flags, nao ha metadata opt-in de blocking/HUD/save-load.
- Com flags, blocking, HUD Lite e Playable Save/Load Lite coexistem.
- O envelope preserva `browserDemoVersion`, `scene`, `tick` e `html`.
- `outputPath` aparece apenas quando `--out` e usado no CLI.

## Simple HTML Export

```bash
node ./engine/runtime/src/cli.mjs export-html-game ./tmp/my-small-game/scene.json --out ./tmp/my-small-game-export.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-export-full.html --json
```

- O arquivo HTML existe.
- O envelope contem `exportVersion`, `scene`, `outputPath`, `options`, `sizeBytes` e `htmlHash`.
- O export default nao embute opt-ins.
- O export completo embute movement blocking, HUD Lite e Playable Save/Load Lite.
- O export e snapshot de cena em HTML, nao runtime autoritativo de gameplay.
- Quando houver sprite real, o export ainda deve ser validado com fallback deterministico porque `export-html-game` nao empacota Asset Manifest.

## HTML proibido

O HTML gerado nao deve conter:

- `fetch`;
- `localStorage`;
- `sessionStorage`;
- `IndexedDB`;
- `Date.now`;
- `new Date`;
- `performance.now`;
- scripts externos;
- `import(`;
- `link href` externo.

## Budgets v1

- Top-down baseline atual: 50 drawCalls, 25 blockers solidos, 30597 B de export HTML completo.
- Top-down hard ceiling: ate 64 drawCalls, ate 32 blockers solidos, ate 32000 B de export HTML completo.
- Side-view blocking baseline atual: 15 drawCalls, 11 blockers solidos, 26774 B de export HTML completo.
- Side-view blocking hard ceiling: ate 32 drawCalls, ate 16 blockers solidos, ate 32000 B de export HTML completo.
- Mapas maiores devem esperar pacote futuro de escala/perf.
- Cada tile nao vazio custa 1 drawCall.
- Cada tile `solid: true` custa 1 drawCall, 1 blocker serializado e 1 item no scan de input local.
- Use `empty` para fundo/piso decorativo quando possivel.

## Determinismo

- `run-replay` foi usado apenas como smoke de loop.
- `render-snapshot` foi comparado entre execucoes para cobrir render/tile/camera.
- `inspect-movement-blocking` foi rodado para caminho bloqueado e caminho livre.
- `export-html-game` foi rodado com o mesmo input para confirmar `htmlHash` estavel quando aplicavel.

## Gate do jogo criado

Este gate deve apontar para o diretorio real do jogo. Ele nao e substituido por `npm run validate:scenes`, porque esse script valida apenas `./scenes`.

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./tmp/my-small-game/scene.json --json
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-down.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-down.intent.json --json
node ./engine/runtime/src/cli.mjs render-snapshot ./tmp/my-small-game/scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-full.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-export-full.html --json
```

## MCP minimo

- `validate_scene`
- `validate_input_intent`
- `inspect_movement_blocking`
- `render_snapshot`
- `render_browser_demo`
- `export_html_game`

## Baseline do repositorio

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Fora de escopo preservado

- template engine;
- prefab system;
- editor;
- fisica;
- gravidade;
- jump/platformer real;
- pathfinding;
- combate;
- inventario;
- UI system completo;
- audio;
- animation;
- bundler ou build pipeline V2.
