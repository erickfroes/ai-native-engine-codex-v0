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
- `fields.tiles` deve bater exatamente com a grade declarada: `rows` linhas e `columns` colunas por linha.
- `fields.palette` e obrigatorio, deve ter pelo menos um tile e funciona como lookup obrigatorio para todos os ids usados em `fields.tiles`.
- cada tile id em `fields.tiles` deve ser inteiro ou string nao vazia e existir em `fields.palette`.
- entradas de palette `kind: "empty"` ocupam a celula na grade, mas nao geram drawCall.
- entradas de palette `kind: "rect"` geram drawCall `rect`.
- `palette.*.width` e `palette.*.height` sao opcionais; quando presentes, sobrescrevem o tamanho visual daquele tile. Quando ausentes, usam `tileWidth` e `tileHeight`.
- `fields.layer` e opcional; quando ausente, usa `0`.
- campos extras nao sao permitidos nos niveis controlados; `tile.layer` v1 cobre apenas render declarativo.

## Render

`tile.layer` nao adiciona um novo tipo ao `RenderSnapshot v1`. O builder expande cada tile `rect` em uma draw call existente:

- `kind: "rect"`;
- `id: "<entityId>.tile.<row>.<col>"`;
- `x = col * tileWidth`;
- `y = row * tileHeight`;
- `width` e `height` vem do override na palette ou do tamanho base do tile;
- `layer` vem de `tile.layer.fields.layer`.

`tile.layer` usa a origem da propria grade. Ele nao aplica `transform` da entidade ao calcular `x`/`y` dos tiles em v1.

Depois da expansao, as draw calls continuam ordenadas por `layer` e depois por `id`, como todo `RenderSnapshot v1`. A ordenacao por `id` e lexicografica, portanto ids com indices de dois digitos seguem a regra textual do id, nao uma ordenacao numerica row-major separada.

## Compatibilidade

- cenas antigas sem `tile.layer` continuam inalteradas.
- `visual.sprite` e `sprite` legado continuam funcionando como antes.
- Render SVG v1, Browser Playable Demo v1 e Canvas 2D local consomem os `rect` drawCalls gerados sem backend novo.
- o HTML da Browser Demo continua autocontido, sem `fetch`, rede, scripts externos, servidor ou WebGL.
- `tile.layer` v1 e intencionalmente pequeno; nao define budget validado para mapas densos grandes nem modelo de chunks.

## Fora de escopo

- editor de mapa;
- autotile;
- colisao;
- pathfinding;
- chunks ou chunk streaming;
- atlas/UV/materials;
- importacao de assets reais;
- backend grafico externo.
