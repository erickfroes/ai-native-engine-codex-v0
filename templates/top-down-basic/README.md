# Top Down Basic Template

Small V1 template for a top-down room with a controllable player, solid tiles, camera viewport, collision bounds and deterministic visual fallback.

## Try It

```bash
node ../../engine/runtime/src/cli.mjs validate-scene ./scene.json --json
node ../../engine/runtime/src/cli.mjs render-browser-demo ./scene.json --movement-blocking --gameplay-hud --playable-save-load --out ../../tmp/top-down-basic.html --json
node ../../engine/runtime/src/cli.mjs export-html-game ./scene.json --movement-blocking --gameplay-hud --playable-save-load --out ../../tmp/top-down-basic-export.html --json
```

## Gameplay Shape

- `player.hero` starts at world position `4,8`.
- Moving right is blocked by a solid tile at `map.room.tile.2.3`.
- Moving down is open.
- `goal.marker` is non-solid and exists only as a copy-and-adapt visual marker.

This is a template, not a prefab system or template engine.
