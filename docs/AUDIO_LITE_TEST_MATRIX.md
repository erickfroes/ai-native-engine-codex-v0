# Audio Lite v1 Test Matrix

Audio Lite v1 is the first incremental package after the V1 Small 2D release checkpoint. This matrix is scoped to audio diagnostics and browser/export opt-ins; it does not redefine the V1 release gate.

## Coverage

| Area | Command/Test | Coverage |
| --- | --- | --- |
| Component contract | `engine/runtime/test/component-registry-v1.test.mjs`, `engine/runtime/test/scene-validation.test.mjs` | `audio.clip` schema, invariants, allowed triggers, safe `src`, no extra fields. |
| Runtime report | `engine/runtime/test/audio-lite-runtime.test.mjs` | Empty scenes, sfx, music loop, `onBlockedMove`, missing `src`, invalid trigger, deterministic ordering. |
| CLI report | `engine/runtime/test/cli-inspect-audio-lite.test.mjs` | `inspect-audio-lite <scene> --json`, readable output, invalid scene errors. |
| MCP report | `tools/mcp-server/test/mcp-server.test.mjs` | `inspect_audio_lite`, tools/list catalog, empty and populated reports. |
| Cross-interface | `engine/runtime/test/audio-lite-cross-interface.integration.test.mjs` | Exact runtime = CLI = MCP parity for empty, warning, invalid local ref and invalid scene cases. |
| Browser Demo opt-in | `engine/runtime/test/browser-playable-demo-runtime.test.mjs`, `engine/runtime/test/cli-render-browser-demo.test.mjs`, `tools/mcp-server/test/mcp-server.test.mjs` | `--audio-lite` / `audioLite: true` embeds metadata and controls only when requested. |
| Simple HTML Export opt-in | `engine/runtime/test/simple-html-export-v1.test.mjs` | `export-html-game --audio-lite` and `export_html_game({ audioLite: true })` write deterministic HTML with normalized options. |
| Forbidden browser APIs | Browser/export tests | Guards against `fetch`, storage, external scripts, dynamic imports, time APIs and forced autoplay surfaces. |

## Validation Commands

```bash
node --test ./engine/runtime/test/audio-lite-runtime.test.mjs
node --test ./engine/runtime/test/cli-inspect-audio-lite.test.mjs
node --test ./engine/runtime/test/audio-lite-cross-interface.integration.test.mjs
node --test ./engine/runtime/test/browser-playable-demo-runtime.test.mjs
node --test ./engine/runtime/test/cli-render-browser-demo.test.mjs
node --test ./engine/runtime/test/simple-html-export-v1.test.mjs
node --test ./tools/mcp-server/test/mcp-server.test.mjs
npm test
npm run validate:scenes
npm run smoke
```

## Notes

- `npm run validate:scenes` still validates the canonical scenes in `./scenes`; Audio Lite scene coverage is fixture-based in `engine/runtime/test/fixtures`.
- Browser Demo/export audio is opt-in and diagnostic. It is not a mixer, audio graph, streaming system, spatial audio, timeline or editor feature.
- Headless runtime never plays audio; it only emits `AudioLiteReport v1`.
