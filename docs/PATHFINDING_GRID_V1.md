# Pathfinding Grid v1

## Objetivo

`Pathfinding Grid v1` adiciona um report deterministico e opt-in para diagnosticar ocupacao de grids 2D pequenos derivados de `tile.layer` e `collision.bounds`.

Este slice nao calcula rota. Ele apenas materializa quais celulas de cada `tile.layer` estao bloqueadas por tiles solidos ou bounds solidos.

## Interfaces

- Runtime: `buildPathfindingGridReportV1(sceneOrPath)`.
- CLI: `inspect-pathfinding-grid <scene> [--json]`.
- MCP: `inspect_pathfinding_grid({ path })`.
- Schema formal: `docs/schemas/pathfinding-grid-report-v1.schema.json`.

## Shape

```json
{
  "pathfindingGridReportVersion": 1,
  "scene": "pathfinding-grid-basic-fixture",
  "grids": [
    {
      "gridId": "map.nav",
      "layerEntityId": "map.nav",
      "tileWidth": 8,
      "tileHeight": 8,
      "columns": 3,
      "rows": 2,
      "origin": { "x": 0, "y": 0 },
      "cellCount": 6,
      "blockedCellCount": 2,
      "walkableCellCount": 4,
      "blockedCells": [
        {
          "cellId": "map.nav.cell.0.1",
          "row": 0,
          "column": 1,
          "x": 8,
          "y": 0,
          "width": 8,
          "height": 8,
          "blockerIds": ["tile:map.nav.tile.0.1"]
        }
      ]
    }
  ],
  "blockers": [
    {
      "blockerId": "tile:map.nav.tile.0.1",
      "kind": "tile",
      "x": 8,
      "y": 0,
      "width": 8,
      "height": 8,
      "solid": true
    }
  ]
}
```

## Regras

- `grids[]` e emitido por `tile.layer`, ordenado por `layerEntityId`.
- Cada grid preserva a semantica de `tile.layer`: `origin` e sempre `{ "x": 0, "y": 0 }`; `transform` da entidade do layer nao e aplicado.
- `collision.bounds` solidos usam a mesma posicao do `CollisionBoundsReport v1`: `transform + offset local`.
- Tiles solidos usam a mesma semantica do `TileCollisionReport v1`.
- `blockerId` e globalmente unico no report: tiles usam prefixo `tile:` e bounds usam prefixo `collision.bounds:`.
- Um tile solido bloqueia apenas celulas do grid do proprio `layerEntityId`.
- Um `collision.bounds` solido pode bloquear qualquer grid que ele sobreponha.
- Overlap usa AABB com area positiva.
- `blockedCells[]` lista apenas celulas bloqueadas, em ordem `row`, depois `column`.
- `cellCount = rows * columns`.
- `blockedCellCount = blockedCells.length`.
- `walkableCellCount = cellCount - blockedCellCount`.
- O limite v1 por layer e `4096` celulas para evitar payloads grandes em CLI/MCP.

## Compatibilidade

- Nao altera `Scene Document v1`.
- Nao altera `TileCollisionReport v1`, `CollisionBoundsReport v1`, `MovementBlockingReport v1` ou `RenderSnapshot v1`.
- Nao altera `run-loop`, Browser Demo, exports HTML, savegame ou networking.
- Cena sem `tile.layer` retorna `grids: []`.

## Fora de escopo

- A*, BFS ou qualquer route solving;
- path following ou AI runtime;
- diagonais, custos, heuristica, clearance ou raio de agente;
- merge global de multiplos `tile.layer`;
- obstacle updates em runtime;
- editor, overlay visual, navmesh, 3D, savegame ou rede.

## Continuidade

O proximo menor passo seguro e `Atlas/Material Manifest v1`, em superficie declarativa/diagnostica opt-in nova e sem acoplar editor-lite ou pipeline pesado obrigatorio.
