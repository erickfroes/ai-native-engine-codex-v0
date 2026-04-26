# Render SVG v1

## Objetivo

Definir uma serializacao SVG textual, deterministica e headless derivada de `RenderSnapshot v1`.

Nao existe canvas real, Pixi, Three, WebGL ou runtime visual neste slice.

## Runtime

- `renderSnapshotToSvgV1(renderSnapshot)` recebe um `RenderSnapshot v1` valido.
- a saida e uma string SVG estavel com `<?xml ...?>`, `<svg ...>` e draw calls serializados de forma deterministica.
- a ordem dos elementos segue exatamente `renderSnapshot.drawCalls`.
- `viewport.width` e `viewport.height` viram `width`, `height` e `viewBox` do documento SVG.
- draw calls `sprite` ainda usam fallback visual minimo para `<rect>` com `data-asset-id`, sem carregar imagem real.

## CLI e MCP

- CLI: `render-svg <scene> [--tick <n>] [--width <n>] [--height <n>] [--out <path>] [--json]`
- MCP: `render_svg(path, tick?, width?, height?)`

Envelope JSON minimo de CLI `--json` e MCP `structuredContent`:

```json
{
  "svgVersion": 1,
  "scene": "tutorial",
  "tick": 4,
  "svg": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n..."
}
```

No CLI, `outputPath` so aparece quando `--out` e usado.

## Compatibilidade

- deriva de `RenderSnapshot v1` sem alterar o contrato JSON existente;
- nao altera `run-loop`, `InputIntent v1`, Save/Load v1 ou `world.snapshot`;
- serve para comparacao textual deterministica entre runtime, CLI e MCP.

## Fora deste slice

- rasterizacao real;
- backend grafico;
- assets reais obrigatorios;
- editor visual.
