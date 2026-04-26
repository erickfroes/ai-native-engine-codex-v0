# Tile Layer v1

## Objetivo

Declarar uma camada simples de mapa/tile grid na cena e transforma-la em draw calls deterministicas, sem editor, servidor, WebGL, Pixi, Three, assets reais obrigatorios ou pipeline pesado de mapas.

## Componente

`tile.layer` e um componente ECS declarativo:

```json
{
  "kind": "tile.layer",
  "version": 1,
  "replicated": false,
  "fields": {
    "tileWidth": 16,
    "tileHeight": 16,
    "columns": 4,
    "rows": 3,
    "layer": -10,
    "tiles": [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1]
    ],
    "palette": {
      "0": { "kind": "empty" },
      "1": { "kind": "rect", "width": 16, "height": 16 }
    }
  }
}
```

## Regras

- `kind` deve ser exatamente `tile.layer`.
- `version` deve ser exatamente `1`.
- `replicated` deve ser `false`.
- `fields.tileWidth` e `fields.tileHeight` sao obrigatorios, inteiros `>= 1`.
- `fields.columns` e `fields.rows` sao obrigatorios, inteiros `>= 1`.
- `fields.tiles` deve ter exatamente `rows` linhas e cada linha deve ter exatamente `columns` colunas.
- cada tile id em `fields.tiles` deve ser inteiro ou string nao vazia e existir em `fields.palette`.
- `fields.palette` e obrigatorio e deve ter pelo menos um tile.
- entradas de palette `kind: "empty"` nao geram drawCall.
- entradas de palette `kind: "rect"` geram drawCall `rect`.
- `palette.*.width` e `palette.*.height` sao opcionais; quando ausentes, usam `tileWidth` e `tileHeight`.
- `fields.layer` e opcional; quando ausente, usa `0`.
- campos extras nao sao permitidos nos niveis controlados.

## Render

`tile.layer` nao adiciona um novo tipo ao `RenderSnapshot v1`. O builder expande cada tile `rect` em uma draw call existente:

- `kind: "rect"`;
- `id: "<entityId>.tile.<row>.<col>"`;
- `x = col * tileWidth`;
- `y = row * tileHeight`;
- `width` e `height` vem da palette ou do tamanho do tile;
- `layer` vem de `tile.layer.fields.layer`.

Depois da expansao, as draw calls continuam ordenadas por `layer` e depois por `id`, como todo `RenderSnapshot v1`.

## Compatibilidade

- cenas antigas sem `tile.layer` continuam inalteradas.
- `visual.sprite` e `sprite` legado continuam funcionando como antes.
- Render SVG v1, Browser Playable Demo v1 e Canvas 2D local consomem os `rect` drawCalls gerados sem backend novo.
- o HTML da Browser Demo continua autocontido, sem `fetch`, rede, scripts externos, servidor ou WebGL.

## Fora de escopo

- editor de mapa;
- autotile;
- colisao;
- pathfinding;
- chunk streaming;
- atlas/UV/materials;
- importacao de assets reais;
- backend grafico externo.
