# Camera Viewport v1

## Objetivo

Definir um componente declarativo minimo para deslocar a camera nas saidas de render headless ja existentes, sem zoom, culling, follow target, smooth camera ou editor.

## Componente

Nome do componente:

- `camera.viewport`

Shape v1:

```json
{
  "kind": "camera.viewport",
  "version": 1,
  "replicated": false,
  "fields": {
    "x": 0,
    "y": 0,
    "width": 320,
    "height": 180
  }
}
```

## Regras

- `kind` deve ser exatamente `camera.viewport`.
- `version` deve ser exatamente `1`.
- `replicated` deve ser exatamente `false`.
- `fields.x` e `fields.y` devem ser inteiros.
- `fields.width` e `fields.height` devem ser inteiros `>= 1`.
- campos extras nao sao permitidos.
- apenas um `camera.viewport` e permitido por cena.

## Efeito no render

- sem `camera.viewport`, o comportamento atual do `RenderSnapshot v1` permanece igual.
- com `camera.viewport`, o builder aplica offset em todos os drawCalls:
  - `drawCall.x = worldX - camera.viewport.fields.x`
  - `drawCall.y = worldY - camera.viewport.fields.y`
- `viewport.width` e `viewport.height` passam a usar a camera, salvo override explicito por opcoes do runtime/CLI/MCP.
- nao existe culling: drawCalls fora da viewport continuam presentes.

## Integracao

- `RenderSnapshot v1` continua com o mesmo shape.
- `Render SVG v1`, `Canvas2D Demo v1` e `Browser Playable Demo v1` apenas consomem os drawCalls ja deslocados.
- `visual.sprite` e `tile.layer` continuam funcionando.

## Fora de escopo

- zoom;
- culling;
- follow target;
- smooth camera;
- screen shake;
- editor;
- Pixi, Three ou WebGL.
