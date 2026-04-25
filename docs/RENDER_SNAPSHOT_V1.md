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

## Builder runtime

- `buildRenderSnapshotV1(scenePathOuScene, options)` retorna este contrato sem canvas real.
- `tick` padrao e `0`; viewport padrao e `320x180`.
- nesta versao, entidades com componente `transform` viram `rect`.
- `x` e `y` vem de `transform.fields.position` ou de `transform.fields`.
- `width` e `height` podem vir de `sprite.fields`; se ausentes, usam fallback deterministico `16x16`.
- `layer` pode vir de `sprite.fields.layer`; se ausente, usa `0`.
- `drawCalls` sao ordenados por `layer` e depois `id`.

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
