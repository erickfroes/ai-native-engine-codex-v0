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
    },
    {
      "kind": "sprite",
      "id": "camera.icon",
      "assetId": "camera.icon",
      "x": 20,
      "y": 0,
      "width": 16,
      "height": 16,
      "layer": 1
    }
  ]
}
```

## Regras v1

- `renderSnapshotVersion` deve ser exatamente `1`.
- `scene` identifica `metadata.name` da cena.
- `tick` representa o tick observado e deve ser inteiro `>= 0`.
- `viewport.width` e `viewport.height` devem ser inteiros `>= 1`.
- `drawCalls` contem chamadas declarativas com `kind: "rect"` ou `kind: "sprite"`.
- toda draw call declara `id`, `x`, `y`, `width`, `height` e `layer`.
- draw calls `sprite` tambem declaram `assetId`.
- draw calls `sprite` podem declarar `assetSrc` opcional quando derivadas de um `Asset Manifest v1` validado.
- campos extras nao sao permitidos nos niveis controlados do contrato.

## Builder runtime

- `buildRenderSnapshotV1(scenePathOuScene, options)` retorna este contrato sem canvas real.
- `renderSnapshotToSvgV1(renderSnapshot)` pode serializar esse contrato para SVG textual deterministico.
- `tick` padrao e `0`; viewport padrao e `320x180`.
- nesta versao, entidades com componente `transform` ainda viram `rect` por padrao.
- `options.assetManifest` ou `options.assetManifestPath` ativam a leitura opt-in de `Asset Manifest v1`.
- quando um manifesto opt-in existe e a entidade declara `visual.sprite.fields.assetId`, o builder pode emitir `drawCalls.kind = "sprite"`.
- o componente legado `sprite` continua aceito pelo builder para compatibilidade; quando `visual.sprite` existe, ele e a fonte preferida para `assetId`, `width`, `height` e `layer`.
- sem manifesto, o builder preserva o fallback atual para `rect`.
- `assetManifestPath` deve apontar para um manifesto local valido; paths absolutos no `src` do manifesto e traversal sao rejeitados.
- `x` e `y` vem de `transform.fields.position` ou de `transform.fields`.
- `width` e `height` podem vir de `visual.sprite.fields`; se ausentes, usam fallback deterministico `16x16` ou o tamanho declarado no manifesto quando houver `assetId`.
- `layer` pode vir de `visual.sprite.fields.layer`; se ausente, usa `0`.
- `drawCalls` sao ordenados por `layer` e depois `id`.
- suporte a `sprite` existe no contrato, mas o uso por `assetManifest` continua opt-in e minimalista.
- renderers desta versao continuam livres para usar fallback visual minimo para `sprite`; a browser demo pode tentar `Image()` local via `assetSrc`, sem fetch e sem rede.

Ver tambem: `docs/RENDER_SVG_V1.md`.

## Escopo

- contrato serializavel e estavel para validacao visual headless;
- base para comparacao deterministica entre runtime, CLI e MCP;
- base para sprites declarativos locais com fallback visual deterministico;
- nenhuma rasterizacao real nesta versao.

## Fora deste slice

- canvas real;
- Pixi, Three ou WebGL;
- assets reais obrigatorios;
- editor visual;
- frame graph ou backend grafico.
