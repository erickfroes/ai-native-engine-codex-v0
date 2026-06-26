# Visual Components v1

## Objetivo

Declarar intencao visual minima na propria cena sem criar editor, servidor, backend grafico ou pipeline pesado de assets.

Tile grids usam o contrato separado `tile.layer`; ver `docs/TILE_LAYER_V1.md`.

## visual.sprite

Componente atual:

```json
{
  "kind": "visual.sprite",
  "version": 1,
  "replicated": false,
  "fields": {
    "assetId": "player.sprite",
    "atlasBindingId": "player.hero",
    "width": 16,
    "height": 16,
    "layer": 0
  }
}
```

Regras:

- `kind` deve ser exatamente `visual.sprite`.
- `version` deve ser exatamente `1`.
- `replicated` deve ser `false`.
- `fields.assetId` e obrigatorio, string e nao vazio.
- `fields.atlasBindingId` e opcional, string nao vazia quando presente; ele aponta para `Atlas/Material Manifest v1` `sprites[].id` somente nos fluxos que recebem `atlasMaterialManifestPath`.
- `fields.width` e `fields.height` sao opcionais; quando presentes, devem ser inteiros `>= 1`.
- `fields.layer` e opcional; quando ausente, o render usa `0`.
- campos extras em `fields` nao sao permitidos.

## Render

- `visual.sprite` e declarativo; ele nao carrega imagem sozinho.
- com `Asset Manifest v1`, `buildRenderSnapshotV1` resolve `assetId` e pode emitir drawCall `sprite` com `assetSrc`.
- com `Atlas/Material Manifest v1` opt-in na Browser Demo ou Portable HTML Export v2, `atlasBindingId` resolve `sprites[].id`; o consumo e sprite-only e nao altera `RenderSnapshot v1`.
- o uso legado de `assetId` como binding logico de atlas permanece apenas para compatibilidade do slice anterior.
- sem `Asset Manifest v1`, o comportamento continua usando fallback `rect`.
- quando `sprite` legado e `visual.sprite` coexistem na mesma entidade, `visual.sprite` e a fonte preferida para `assetId`, `width`, `height` e `layer`.
- se `width` ou `height` nao forem declarados no componente, o builder usa as dimensoes do asset manifest quando disponiveis.
- a Browser Playable Demo pode tentar `new Image()` local via `assetSrc`, sem `fetch`, rede ou scripts externos.
- se a imagem local nao carregar, o HTML continua desenhando o fallback `rect`.
- `visual.sprite` invalido falha a validacao da cena antes de `render-snapshot`, `render-svg` e `render-browser-demo`.

## Fora de escopo

- editor visual;
- servidor ou backend de assets;
- Pixi, Three ou WebGL;
- tiles atlas-backed;
- animacao, UV, materiais completos e frame graph;
- importacao ou validacao de bytes reais de imagem.
