# Side View Blocking Basic Template

Small V1 template for a side-view scene with simple tile blocking. It is intentionally not a platformer: there is no gravity, jump, physics integration or character controller.

## Try It

```bash
node ../../engine/runtime/src/cli.mjs validate-scene ./scene.json --json
node ../../engine/runtime/src/cli.mjs render-browser-demo ./scene.json --movement-blocking --gameplay-hud --playable-save-load --out ../../tmp/side-view-blocking-basic.html --json
node ../../engine/runtime/src/cli.mjs export-html-game ./scene.json --movement-blocking --gameplay-hud --playable-save-load --out ../../tmp/side-view-blocking-basic-export.html --json
```

## Gameplay Shape

- `player.hero` starts at world position `4,8`.
- Moving right is blocked by a solid tile at `map.stage.tile.2.3`.
- Moving down is open.
- The bottom row is solid scenery for a side-view feel, but it does not implement gravity.

This is a copy-and-adapt scene template, not a platformer engine, prefab system or template engine.
