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

## CLI

- `render-snapshot`
- `render-browser-demo`
- `render-browser-demo --movement-blocking`
- `render-browser-demo --gameplay-hud`
- `render-browser-demo --gameplay-hud --movement-blocking`
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
- `render_browser_demo` com `gameplayHud: true` e `movementBlocking: true`
- `inspect_collision_bounds`
- `inspect_collision_overlaps`
- `inspect_tile_collision`
- `inspect_movement_blocking`
- `run_loop`
- `run_loop` com `movementBlocking: true`

## Suites

- `engine/runtime/test/v1-small-2d-readiness-runtime-cli.test.mjs`
- `engine/runtime/test/v1-small-2d-readiness-cross-interface.integration.test.mjs`

## Validacao Obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```
