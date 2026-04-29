# V1 Small 2D Test Matrix

## Cena

- `scenes/v1-small-2d.scene.json`
- `templates/top-down-basic/scene.json`
- `templates/side-view-blocking-basic/scene.json`

## Intents

- `fixtures/input/v1-small-2d-move-right.intent.json`
- `fixtures/input/v1-small-2d-move-down.intent.json`
- `templates/top-down-basic/input/move-right.intent.json`
- `templates/top-down-basic/input/move-down.intent.json`
- `templates/side-view-blocking-basic/input/move-right.intent.json`
- `templates/side-view-blocking-basic/input/move-down.intent.json`

## Runtime

- `buildRenderSnapshotV1`
- `buildHtmlGameExportV1`
- `exportHtmlGameV1`
- `buildCollisionBoundsReportV1`
- `buildCollisionOverlapReportV1`
- `buildTileCollisionReportV1`
- `buildMovementBlockingReportV1`
- `runMinimalSystemLoop`
- `renderBrowserPlayableDemoHtmlV1`

## CLI

- `validate-scene`
- `render-snapshot`
- `render-browser-demo`
- `render-browser-demo --movement-blocking`
- `render-browser-demo --gameplay-hud`
- `render-browser-demo --playable-save-load`
- `render-browser-demo --gameplay-hud --playable-save-load`
- `render-browser-demo --gameplay-hud --movement-blocking`
- `render-browser-demo --gameplay-hud --movement-blocking --playable-save-load`
- `export-html-game`
- `export-html-game --movement-blocking`
- `export-html-game --gameplay-hud`
- `export-html-game --playable-save-load`
- `export-html-game --movement-blocking --gameplay-hud --playable-save-load`
- `inspect-collision-bounds`
- `inspect-collision-overlaps`
- `inspect-tile-collision`
- `inspect-movement-blocking`
- `run-loop`
- `run-loop --movement-blocking`

## MCP

- `validate_scene`
- `render_snapshot`
- `render_browser_demo`
- `render_browser_demo` com `movementBlocking: true`
- `render_browser_demo` com `gameplayHud: true`
- `render_browser_demo` com `playableSaveLoad: true`
- `render_browser_demo` com `gameplayHud: true` e `movementBlocking: true`
- `render_browser_demo` com `gameplayHud: true`, `movementBlocking: true` e `playableSaveLoad: true`
- `export_html_game`
- `export_html_game` com `movementBlocking: true`, `gameplayHud: true` e `playableSaveLoad: true`
- `inspect_collision_bounds`
- `inspect_collision_overlaps`
- `inspect_tile_collision`
- `inspect_movement_blocking`
- `run_loop`
- `run_loop` com `movementBlocking: true`

## Suites

- `engine/runtime/test/v1-small-2d-readiness-runtime-cli.test.mjs`
- `engine/runtime/test/v1-small-2d-readiness-cross-interface.integration.test.mjs`
- `engine/runtime/test/browser-playable-demo-runtime.test.mjs`
- `engine/runtime/test/cli-render-browser-demo.test.mjs`
- `engine/runtime/test/simple-html-export-v1.test.mjs`
- `engine/runtime/test/game-templates-v1.test.mjs`
- `tools/mcp-server/test/mcp-server.test.mjs`

## Validacao Obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Hardening Browser Demo

- cena canonica coberta sem flags, com `movementBlocking`, com `gameplayHud`, com `playableSaveLoad` e com combinacoes principais.
- HTML canonico permanece sem `fetch`, `localStorage`, `sessionStorage`, `IndexedDB`, `Date.now`, `new Date`, `performance.now`, scripts externos, `import(` ou `link href`.
- envelopes CLI/MCP preservam `browserDemoVersion`, `scene`, `tick` e `html`.
- `outputPath` aparece apenas no CLI quando `--out` e usado.
- Playable Save/Load Lite exporta/importa JSON local no textarea e nao usa `savegame v1`, `save-state` ou `load-save`.
- `npm run smoke` valida essa cobertura por meio de `npm test`; ele nao tem comando dedicado separado para gerar o HTML V1.
- `export-html-game` cobre escrita de arquivo, envelope `exportVersion`, `outputPath`, `options`, `sizeBytes` e `htmlHash`.
- `export_html_game` cobre escrita MCP segura dentro do repo e paridade minima com CLI.
- Game Templates v1 cobre validate-scene, render-snapshot, render-browser-demo, export-html-game e MCP para os dois templates.
- Game Templates v1 tambem fixa budgets pequenos de drawCalls e tamanho de export HTML.

## Proximo Pacote Recomendado

- `V1 Small 2D Game Creation Guide / Codex package` usando os templates e o export HTML simples.
- Manter fora deste pacote: editor, servidor, build system amplo, UI system completo e savegame avancado.
