# Visual Components v1

## Objetivo

Declarar intencao visual minima na propria cena sem criar editor, servidor, backend grafico ou pipeline pesado de assets.

## visual.sprite

Componente atual:

```json
{
  "kind": "visual.sprite",
  "version": 1,
  "replicated": false,
  "fields": {
    "assetId": "player.sprite",
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
- `fields.width` e `fields.height` sao opcionais; quando presentes, devem ser inteiros `>= 1`.
- `fields.layer` e opcional; quando ausente, o render usa `0`.
- campos extras em `fields` nao sao permitidos.

## Render

- `visual.sprite` e declarativo; ele nao carrega imagem sozinho.
- com `Asset Manifest v1`, `buildRenderSnapshotV1` resolve `assetId` e pode emitir drawCall `sprite` com `assetSrc`.
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
- atlas, animacao, UV, materiais e frame graph;
- importacao ou validacao de bytes reais de imagem.
