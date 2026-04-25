# Canvas2D Demo v1

## Objetivo

Definir o contrato minimo do Canvas2D Demo v1: uma visualizacao HTML estatica, textual e deterministica derivada de `RenderSnapshot v1` usando Canvas 2D nativo do navegador.

Nao existe Pixi, Three, WebGL, editor, captura real de input, loop interativo real ou dependencias externas neste slice.

## Contrato minimo

- runtime: `renderCanvas2DDemoHtmlV1({ title, renderSnapshot, metadata })`
- CLI: `render-canvas-demo <scene> [--tick <n>] [--width <n>] [--height <n>] [--out <path>] [--json]`
- MCP: `render_canvas_demo(path, tick?, width?, height?)`
- a saida e um documento HTML com `<canvas>` e um unico `script` inline minimo
- o HTML e autocontido, sem scripts externos, pacotes, fetches de rede ou assets externos
- o script desenha apenas `drawCalls` com `kind: "rect"`
- `title` e `metadata` sao escapados como HTML
- `scene` e `id` do snapshot sao serializados com escaping seguro para script inline

Envelope JSON minimo de CLI `--json` e MCP `structuredContent`:

```json
{
  "canvasDemoVersion": 1,
  "scene": "tutorial",
  "tick": 4,
  "html": "<!DOCTYPE html>\n..."
}
```

`outputPath` so aparece no CLI quando `--out` e usado.

## Limites

- visualizacao estatica e deterministica
- usa apenas Canvas 2D nativo
- sem dependencias externas
- sem captura real de input
- nao substitui runtime visual real
- nao adiciona input real
- nao adiciona loop interativo
- nao adiciona editor
- nao adiciona assets reais
