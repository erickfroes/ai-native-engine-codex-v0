# Meta 2 Visual Test Matrix

Esta matriz lista apenas superficies existentes na Meta 2.

## Runtime APIs principais

| Fluxo | Runtime API | Cobertura |
| --- | --- | --- |
| RenderSnapshot v1 | `buildRenderSnapshotV1` | `engine/runtime/test/render-snapshot-runtime.test.mjs` |
| Render SVG v1 | `renderSnapshotToSvgV1` | `engine/runtime/test/render-svg-runtime.test.mjs` |
| SVG Demo HTML v1 | `renderSvgDemoHtmlV1` | `engine/runtime/test/render-svg-demo-html-runtime.test.mjs` |
| Canvas2D Demo v1 | `renderCanvas2DDemoHtmlV1` | `engine/runtime/test/render-canvas2d-demo-html-runtime.test.mjs` |
| Browser Playable Demo v1 | `renderBrowserPlayableDemoHtmlV1` | `engine/runtime/test/browser-playable-demo-runtime.test.mjs` |
| Browser demo asset materialization | `materializeBrowserDemoAssetSrcV1` | `engine/runtime/test/browser-playable-demo-runtime.test.mjs` |
| Asset Manifest v1 | `validateAssetManifestV1` | `engine/runtime/test/asset-manifest-v1.test.mjs` |
| Component Registry v1 | `getComponentRegistryV1` | `engine/runtime/test/component-registry-v1.test.mjs` |

## CLI principal

| Fluxo | Comando | Cobertura |
| --- | --- | --- |
| RenderSnapshot v1 | `render-snapshot` | `engine/runtime/test/cli-render-snapshot.test.mjs` |
| Render SVG v1 | `render-svg` | `engine/runtime/test/cli-render-svg.test.mjs` |
| SVG Demo HTML v1 | `render-svg-demo` | `engine/runtime/test/cli-render-svg-demo.test.mjs` |
| Canvas2D Demo v1 | `render-canvas-demo` | `engine/runtime/test/cli-render-canvas-demo.test.mjs` |
| Browser Playable Demo v1 | `render-browser-demo` | `engine/runtime/test/cli-render-browser-demo.test.mjs` |
| Scene validation | `validate-scene`, `validate-all-scenes` | `engine/runtime/test/scene-validation.test.mjs` |

## MCP principal

| Fluxo | Tool MCP | Cobertura |
| --- | --- | --- |
| RenderSnapshot v1 | `render_snapshot` | `engine/runtime/test/render-snapshot-cross-interface.integration.test.mjs`, `tools/mcp-server/test/mcp-server.test.mjs` |
| Render SVG v1 | `render_svg` | `engine/runtime/test/render-svg-cross-interface.integration.test.mjs`, `tools/mcp-server/test/mcp-server.test.mjs` |
| Canvas2D Demo v1 | `render_canvas_demo` | `engine/runtime/test/render-canvas2d-demo-cross-interface.integration.test.mjs` |
| Browser Playable Demo v1 | `render_browser_demo` | `engine/runtime/test/browser-playable-demo-cross-interface.integration.test.mjs`, `tools/mcp-server/test/mcp-server.test.mjs` |
| Scene validation | `validate_scene` | `engine/runtime/test/scene-validation-report-cross-interface.integration.test.mjs`, `tools/mcp-server/test/mcp-server.test.mjs` |

`render-svg-demo` nao possui tool MCP dedicada na Meta 2; ele e coberto por runtime + CLI e pelo cross-check com `Render SVG v1`.

## Componentes e contratos visuais

| Contrato | Cobertura |
| --- | --- |
| `sprite` drawCall | `engine/runtime/test/render-snapshot-v1.test.mjs`, `engine/runtime/test/render-snapshot-runtime.test.mjs` |
| `visual.sprite` | `engine/runtime/test/scene-validation.test.mjs`, `engine/runtime/test/render-snapshot-runtime.test.mjs`, `engine/runtime/test/browser-playable-demo-runtime.test.mjs` |
| `tile.layer` | `engine/runtime/test/scene-validation.test.mjs`, `engine/runtime/test/render-snapshot-runtime.test.mjs`, `engine/runtime/test/render-svg-cross-interface.integration.test.mjs` |
| `camera.viewport` | `engine/runtime/test/scene-validation.test.mjs`, `engine/runtime/test/render-snapshot-runtime.test.mjs`, `engine/runtime/test/render-snapshot-cross-interface.integration.test.mjs` |
| Asset Manifest v1 | `engine/runtime/test/asset-manifest-v1.test.mjs`, `engine/runtime/test/cli-render-browser-demo.test.mjs` |

## Cross-interface

| Fluxo | Suite |
| --- | --- |
| Runtime/CLI/MCP RenderSnapshot | `engine/runtime/test/render-snapshot-cross-interface.integration.test.mjs` |
| Runtime/CLI/MCP Render SVG | `engine/runtime/test/render-svg-cross-interface.integration.test.mjs` |
| Runtime/CLI/MCP Canvas2D Demo | `engine/runtime/test/render-canvas2d-demo-cross-interface.integration.test.mjs` |
| Runtime/CLI/MCP Browser Playable Demo | `engine/runtime/test/browser-playable-demo-cross-interface.integration.test.mjs` |
| SVG demo CLI/runtime consistency | `engine/runtime/test/render-svg-demo-html-cross-check.integration.test.mjs` |

## Validacao obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Observacoes de escopo

- SVG e Canvas2D demos sao visualizacoes deterministicas, nao runtime grafico real.
- Browser Playable Demo tem input local e loop visual local; nao executa systems de gameplay.
- Nao ha Pixi, Three, WebGL, editor visual ou servidor na Meta 2.
