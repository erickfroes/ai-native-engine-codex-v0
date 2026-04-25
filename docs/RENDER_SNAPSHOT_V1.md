# Render Snapshot v1

## Objetivo

Definir um contrato JSON headless e deterministico para descrever uma vista renderizavel de uma cena sem canvas real, WebGL, Pixi, Three ou assets de render.

## Shape minimo

```json
{
  "renderSnapshotVersion": 1,
  "scene": "tutorial",
  "tick": 4,
  "viewport": {
    "width": 320,
    "height": 180
  },
  "drawCalls": [
    {
      "kind": "rect",
      "id": "player.hero",
      "x": 0,
      "y": 0,
      "width": 16,
      "height": 16,
      "layer": 0
    }
  ]
}
```

## Regras v1

- `renderSnapshotVersion` deve ser exatamente `1`.
- `scene` identifica `metadata.name` da cena.
- `tick` representa o tick observado e deve ser inteiro `>= 0`.
- `viewport.width` e `viewport.height` devem ser inteiros `>= 1`.
- `drawCalls` contem chamadas declarativas; nesta versao apenas `kind: "rect"`.
- cada draw call declara `id`, `x`, `y`, `width`, `height` e `layer`.
- campos extras nao sao permitidos nos niveis controlados do contrato.

## Escopo

- contrato serializavel e estavel para validacao visual headless;
- base para comparacao deterministica entre runtime, CLI e MCP;
- nenhuma rasterizacao real nesta versao.

## Fora deste slice

- canvas real;
- Pixi, Three ou WebGL;
- assets reais;
- editor visual;
- frame graph ou backend grafico.
