# Tile Collision v1

## Objetivo

Declarar tiles solidos em `tile.layer` e gerar um relatorio deterministico de bounds de tiles solidos para diagnostico de gameplay futuro, sem fisica, sem resolucao de colisao, sem pathfinding, sem chunk streaming e sem alterar renderizacao.

## Fonte de dados

Tile Collision v1 deriva apenas de `tile.layer`.

Uma entrada `rect` de `tile.layer.fields.palette` pode declarar:

```json
{
  "kind": "rect",
  "width": 16,
  "height": 16,
  "solid": true
}
```

Regras:

- `solid` e opcional.
- `solid` ausente equivale a `false`.
- `solid` deve ser booleano quando presente.
- apenas entries `kind: "rect"` podem declarar `solid`.
- entries `kind: "empty"` nunca geram tile solido.
- `width` e `height` seguem o mesmo override visual da palette quando presentes; caso contrario usam `tileWidth` e `tileHeight`.
- `x = column * tileWidth`.
- `y = row * tileHeight`.
- `transform` da entidade de mapa nao e aplicado em v1, preservando a semantica atual de `tile.layer`.

## APIs

Runtime:

- `buildTileCollisionReportV1(sceneOrPath)`

CLI:

- `inspect-tile-collision <scene> [--json]`

MCP:

- `inspect_tile_collision`

## Shape

```json
{
  "tileCollisionReportVersion": 1,
  "scene": "tile-collision-solid-fixture",
  "tiles": [
    {
      "tileId": "map.walls.tile.0.0",
      "layerEntityId": "map.walls",
      "row": 0,
      "column": 0,
      "paletteId": "1",
      "x": 0,
      "y": 0,
      "width": 16,
      "height": 16,
      "solid": true
    }
  ]
}
```

## Regras do relatorio

- `tiles` contem somente tiles solidos.
- cenas sem `tile.layer` retornam `tiles: []`.
- cenas com `tile.layer`, mas sem palette entries solidas, retornam `tiles: []`.
- `tileId` segue o formato `<layerEntityId>.tile.<row>.<column>`.
- a ordenacao e deterministica por `layerEntityId`, depois `row`, depois `column`, depois `paletteId`.
- a ordenacao e de colisao, nao a ordenacao visual por `layer`.
- o custo v1 e uma varredura simples das grades (`O(layers * cells)`), aceitavel para diagnostico e jogos pequenos 2D.

## Compatibilidade

- nao altera `RenderSnapshot v1`;
- nao altera Render SVG, Canvas2D Demo ou Browser Playable Demo;
- nao altera `visual.sprite`, `camera.viewport` ou `Asset Manifest v1`;
- nao altera `CollisionBoundsReport v1`;
- nao altera `CollisionOverlapReport v1`;
- nao altera `MovementBlockingReport v1`;
- nao altera `run-loop`, `InputIntent v1`, `KeyboardInputScript v1` ou Save/Load v1.

## Fora de escopo

- fisica;
- resolucao de colisao;
- bloquear movimento;
- integrar com `MovementBlockingReport v1`;
- aplicar no `run-loop`;
- aplicar na Browser Demo;
- pathfinding;
- chunk streaming;
- editor;
- servidor;
- Pixi, Three ou WebGL.
