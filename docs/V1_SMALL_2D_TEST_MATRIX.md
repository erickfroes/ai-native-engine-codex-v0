# V1 Small 2D Test Matrix

## Cena

- `scenes/v1-small-2d.scene.json`

## Intents

- `fixtures/input/v1-small-2d-move-right.intent.json`
- `fixtures/input/v1-small-2d-move-down.intent.json`

## Runtime

- `buildRenderSnapshotV1`
- `buildCollisionBoundsReportV1`
- `buildCollisionOverlapReportV1`
- `buildTileCollisionReportV1`
- `buildMovementBlockingReportV1`
- `runMinimalSystemLoop`
- `renderBrowserPlayableDemoHtmlV1`

## CLI

- `render-snapshot`
- `render-browser-demo`
- `render-browser-demo --movement-blocking`
- `render-browser-demo --gameplay-hud`
- `render-browser-demo --playable-save-load`
- `render-browser-demo --gameplay-hud --playable-save-load`
- `render-browser-demo --gameplay-hud --movement-blocking`
- `render-browser-demo --gameplay-hud --movement-blocking --playable-save-load`
- `inspect-collision-bounds`
- `inspect-collision-overlaps`
- `inspect-tile-collision`
- `inspect-movement-blocking`
- `run-loop`
- `run-loop --movement-blocking`

## MCP

- `render_snapshot`
- `render_browser_demo`
- `render_browser_demo` com `movementBlocking: true`
- `render_browser_demo` com `gameplayHud: true`
- `render_browser_demo` com `playableSaveLoad: true`
- `render_browser_demo` com `gameplayHud: true` e `movementBlocking: true`
- `render_browser_demo` com `gameplayHud: true`, `movementBlocking: true` e `playableSaveLoad: true`
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

## Proximo Pacote Recomendado

- `Simple HTML Export v1` para empacotar a demo jogavel pequena.
- Manter fora deste pacote: editor, servidor, build system amplo, UI system completo e savegame avancado.
