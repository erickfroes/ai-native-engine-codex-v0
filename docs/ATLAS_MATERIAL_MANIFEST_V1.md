# Atlas/Material Manifest v1

## Objetivo

Definir uma superficie declarativa e diagnostica para atlas e materiais 2D sem abrir editor visual, importador de atlas, renderer novo ou pipeline pesado.

O contrato base valida referencias entre um manifesto atlas/material e um `Asset Manifest v1`. O consumo visual v1 e opt-in, sprite-only e restrito a Browser Playable Demo v1 e Portable HTML Export v2; ele nao altera `RenderSnapshot v1`, Simple HTML Export v1, Canvas2D Demo, loop, save/load ou cena persistida.

## Shape minimo

```json
{
  "atlasMaterialManifestVersion": 1,
  "metadata": {
    "name": "starter atlas material pack"
  },
  "assetManifestPath": "./atlas-material.asset-manifest.json",
  "atlases": [
    {
      "id": "world.main",
      "assetId": "atlas.world",
      "regions": [
        { "id": "player.idle", "x": 0, "y": 0, "width": 16, "height": 16 },
        { "id": "tile.grass", "x": 16, "y": 0, "width": 16, "height": 16 }
      ]
    }
  ],
  "materials": [
    { "id": "pixel.sprite", "kind": "sprite", "sampler": "nearest", "alphaMode": "blend" },
    { "id": "pixel.tile", "kind": "tile", "sampler": "nearest", "alphaMode": "opaque" }
  ],
  "sprites": [
    { "id": "player.hero", "atlasId": "world.main", "regionId": "player.idle", "materialId": "pixel.sprite" }
  ],
  "tiles": [
    { "id": "ground.grass", "atlasId": "world.main", "regionId": "tile.grass", "materialId": "pixel.tile" }
  ]
}
```

## Regras v1

- `assetManifestPath` e obrigatorio, relativo seguro ao diretorio do manifesto, sem URL, glob, path absoluto, drive letter ou `..`.
- `assetManifestPath` deve terminar com `.asset-manifest.json`.
- o `Asset Manifest v1` referenciado deve validar por `AssetManifestValidationReport v1`.
- `atlases[].id`, `materials[].id`, `sprites[].id` e `tiles[].id` devem ser strings nao vazias e unicas no seu escopo.
- `atlases[].assetId` deve existir em `Asset Manifest v1`.
- `atlases[].regions[].id` deve ser unico dentro do atlas.
- regioes usam `x/y >= 0` e `width/height >= 1`.
- regioes devem caber dentro de `assets[].width/height` do asset referenciado.
- `materials[].kind` aceita `sprite`, `tile` ou `ui`.
- `materials[].sampler` aceita `nearest` ou `linear`.
- `materials[].alphaMode` aceita `opaque`, `blend` ou `mask`.
- `sprites[]` exige material de kind `sprite`.
- `tiles[]` exige material de kind `tile`.
- bindings com atlas, region ou material ausente falham de forma previsivel.
- regioes ou materiais validos sem uso entram como warnings, nao como erro.

## Runtime, CLI e MCP

- Runtime: `buildAtlasMaterialManifestReportV1(path)`.
- Runtime visual opt-in: `resolveAtlasMaterialRenderInputsV1(scene, { atlasMaterialManifestPath })`.
- CLI: `inspect-atlas-material-manifest <path> [--json]`.
- CLI visual opt-in: `render-browser-demo --atlas-material-manifest <path>` e `export-portable-html-game --atlas-material-manifest <path>`.
- MCP: `inspect_atlas_material_manifest({ path })`.
- MCP visual opt-in: `render_browser_demo({ atlasMaterialManifestPath })` e `export_portable_html_game({ atlasMaterialManifestPath })`.

## Binding explicito de cena

`Atlas Region Binding Contract v1` adiciona `visual.sprite.fields.atlasBindingId` como referencia opcional e explicita para `sprites[].id`.

Exemplo:

```json
{
  "kind": "visual.sprite",
  "version": 1,
  "replicated": false,
  "fields": {
    "assetId": "player.sprite",
    "atlasBindingId": "player.hero",
    "width": 16,
    "height": 16
  }
}
```

Regras:

- `assetId` continua obrigatorio e preserva o fallback V1 sem manifesto.
- `atlasBindingId` e opcional, string nao vazia quando presente.
- com `atlasMaterialManifestPath`, `atlasBindingId` deve existir em `sprites[].id`; refs ausentes falham de forma previsivel.
- sem `atlasMaterialManifestPath`, `atlasBindingId` nao altera render, loop, save/load ou snapshot.
- o fallback legado `assetId -> sprites[].id` permanece apenas para compatibilidade do slice anterior; novas fixtures devem usar `atlasBindingId`.

## Report

`AtlasMaterialManifestReport v1` contem:

- `atlasMaterialManifestReportVersion`;
- `ok`;
- `absolutePath`;
- `assetManifestPath`;
- `assetManifestAbsolutePath`;
- `manifest` parseado quando disponivel;
- `summary`;
- `atlases`;
- `regions`;
- `materials`;
- `spriteBindings`;
- `tileBindings`;
- `errors`;
- `warnings`.

Arquivos ausentes ou JSON malformado retornam `manifest: null` e mensagens estaveis. Manifestos parseaveis invalidos preservam o JSON parseado.

Schemas formais:

- `docs/schemas/atlas-material-manifest-v1.schema.json`;
- `docs/schemas/atlas-material-manifest-report-v1.schema.json`.

## Consumo visual opt-in

- Sem `atlasMaterialManifestPath`, o fallback atual permanece: sprites sem `Asset Manifest v1` viram `rect` e `tile.layer` continua expandindo para drawCalls `rect`.
- Com `atlasMaterialManifestPath`, `visual.sprite.fields.atlasBindingId` aponta para `sprites[].id`; o runtime resolve esse binding para o asset do atlas, preservando o shape de `RenderSnapshot v1`.
- O recorte do atlas vive em `metadata.atlasMaterial` interno da Browser Demo/Portable Export, com `atlasRegionBindingContractVersion`, `hashAlgorithm`, `bindingHash`, `drawCallId`, `bindingId`, `bindingSource`, `atlasId`, `regionId`, `materialId`, `assetId`, source rect, `sampler` e `alphaMode`.
- Browser Demo usa `drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)` e aplica `sampler: "nearest"` via `imageSmoothingEnabled = false` apenas durante o draw daquele sprite.
- Portable HTML Export v2 embute o asset do atlas como `data:` URL usando o `Asset Manifest v1` referenciado pelo manifesto atlas/material.
- `--asset-manifest`/`assetManifestPath` e `--atlas-material-manifest`/`atlasMaterialManifestPath` sao mutuamente exclusivos nesses fluxos.
- Atlas e Sprite Animation v1 nao se compoem neste slice; a combinacao e rejeitada para evitar crop duplo ambiguo.
- `tiles[]` permanece validado/report-only neste slice por decisao explicita; `tile.layer v1` ainda nao possui campo explicito para binding atlas.

## Compatibilidade

- nao altera `Asset Manifest v1`;
- nao altera `RenderSnapshot v1`;
- adiciona apenas um campo opcional a `visual.sprite.fields`;
- altera Browser Demo e Portable HTML Export v2 somente quando `atlasMaterialManifestPath` e fornecido;
- nao altera Canvas2D Demo ou Simple HTML Export;
- nao altera loop, replay, save/load ou netcode;
- Browser Demo nao exige existencia dos bytes das imagens porque preserva fallback local se `Image.onerror` ocorrer;
- Portable HTML Export v2 exige os bytes das imagens referenciadas para embutir `data:` URL;
- nao cria consumo visual obrigatorio de atlas.

## Fora de escopo

- renderer novo;
- UV/crop no contrato de render atual;
- importador/packer automatico de atlas;
- editor visual;
- material system completo;
- shaders, passes ou frame graph;
- tile animation;
- glTF/3D.
