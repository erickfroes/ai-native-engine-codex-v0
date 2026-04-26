# Asset Manifest v1

## Objetivo

Definir um contrato local, declarativo e deterministico para registrar assets de sprite sem introduzir pipeline pesado, editor, rede ou carregamento async de imagem neste slice.

## Shape minimo

```json
{
  "assetManifestVersion": 1,
  "assets": [
    {
      "id": "player.sprite",
      "type": "image",
      "src": "images/player.png",
      "width": 16,
      "height": 16
    }
  ]
}
```

## Regras v1

- `assetManifestVersion` deve ser exatamente `1`.
- `assets` deve ser array.
- `assets[].id` e obrigatorio, nao pode ser vazio e deve ser unico.
- `assets[].type` aceita apenas `image`.
- `assets[].src` deve ser path relativo ao diretorio do proprio manifesto.
- `assets[].src` nao pode escapar do diretorio do manifesto via traversal.
- `assets[].src` absoluto continua proibido.
- `assets[].width` e `assets[].height` devem ser inteiros `>= 1`.
- campos extras nao sao permitidos nos niveis controlados.

## Runtime

- `validateAssetManifestV1(assetManifest)` valida o contrato em memoria.
- `validateAssetManifestV1File(path)` valida o manifesto em disco e preserva `absolutePath`.
- `loadValidatedAssetManifestV1(path)` retorna o manifesto validado ou falha de forma previsivel.
- `buildRenderSnapshotV1(sceneOrPath, { assetManifest, assetManifestPath })` pode usar o manifesto de forma opt-in para emitir `drawCalls.kind = "sprite"`.
- entidades podem declarar `visual.sprite.fields.assetId` para escolher o asset local de forma declarativa na propria cena.
- quando `visual.sprite.fields.width` ou `height` nao sao informados, o builder usa `assets[].width` e `assets[].height` do manifesto.
- o manifesto continua declarativo: valida os metadados, sem importar bytes ou executar transformações no slice de build.

## Compatibilidade

- sem manifesto, o comportamento padrao de `RenderSnapshot v1` permanece inalterado;
- o manifesto nao altera `run-loop`, `InputIntent v1`, Save/Load v1 ou `StateSnapshot v1`;
- o manifesto nao exige existencia de assets reais no contrato;
- o runtime de browser pode carregar localmente imagens via `assetSrc` relativo de forma opcional no HTML, sem fetch/rede.
- quando a browser demo recebe `assetManifestPath`, o `assetSrc` relativo do manifesto e resolvido para `file:///...` local no HTML gerado.
- se a imagem local falhar, `Image.onerror` mantem o fallback visual para `rect`.
- sem `assetManifestPath`, `visual.sprite` e sprites legados continuam usando fallback `rect`.

## Fora deste slice

- image loading em runtime ainda nao usa fetch/streaming; é apenas caminho local no HTML, sem assets inline.
- atlas, animacao, UV, materiais ou frame graph;
- editor de assets;
- servidor;
- fetch, rede ou scripts externos;
- pipeline pesado de importacao.
