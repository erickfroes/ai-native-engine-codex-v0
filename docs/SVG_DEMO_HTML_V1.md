# SVG Demo HTML v1

## Objetivo

Definir uma visualizacao HTML estatica, textual e deterministica derivada de `Render SVG v1`.

Nao existe runtime interativo, canvas, Pixi, Three, WebGL, servidor web ou editor neste slice.

## Contrato minimo

- runtime: `renderSvgDemoHtmlV1({ title, svg, metadata })`
- CLI: `render-svg-demo <scene> [--tick <n>] [--width <n>] [--height <n>] [--out <path>] [--json]`
- a saida e um documento HTML com o SVG embutido inline
- `title` e `metadata` sao escapados como HTML
- o markup SVG recebido e preservado inline, sem backend grafico adicional

Envelope JSON minimo de `render-svg-demo --json`:

```json
{
  "demoHtmlVersion": 1,
  "scene": "tutorial",
  "tick": 4,
  "html": "<!DOCTYPE html>\n..."
}
```

`outputPath` so aparece quando `--out` e usado.

## Limites

- visualizacao estatica para inspecao humana e comparacao deterministica
- nao substitui runtime visual real
- nao adiciona assets reais ou interatividade
