# Collision Bounds v1

## Objetivo

Declarar bounds retangulares de colisao em entidades de cena e gerar um relatorio deterministico para gameplay futuro, sem fisica, resolucao de colisao, bloqueio de movimento ou alteracao de renderizacao.

## Componente

Nome do componente:

- `collision.bounds`

Shape v1:

```json
{
  "kind": "collision.bounds",
  "version": 1,
  "replicated": false,
  "fields": {
    "x": 0,
    "y": 0,
    "width": 16,
    "height": 16,
    "solid": true
  }
}
```

## Regras

- `kind` deve ser exatamente `collision.bounds`.
- `version` deve ser exatamente `1`.
- `replicated` deve ser exatamente `false`.
- `fields` deve ser um objeto.
- `fields.x` e `fields.y` sao opcionais; quando ausentes, usam `0`.
- `fields.x` e `fields.y` devem ser inteiros quando presentes.
- `fields.width` e `fields.height` sao obrigatorios e devem ser inteiros `> 0`.
- `fields.solid` e opcional; quando ausente, usa `true`.
- campos extras nao sao permitidos.

## CollisionBoundsReport v1

API runtime:

- `buildCollisionBoundsReportV1(sceneOrPath)`

CLI:

- `inspect-collision-bounds <scene> [--json]`

MCP:

- `inspect_collision_bounds`

Shape:

```json
{
  "collisionBoundsReportVersion": 1,
  "scene": "collision-bounds-fixture",
  "bounds": [
    {
      "entityId": "player.hero",
      "x": 12,
      "y": 15,
      "width": 12,
      "height": 14,
      "solid": true
    }
  ]
}
```

## Regras do relatorio

- o relatorio usa apenas componentes `collision.bounds` validos.
- `x` final = `transform.x + collision.bounds.fields.x`.
- `y` final = `transform.y + collision.bounds.fields.y`.
- sem `transform`, a base e `0,0`, entao o relatorio usa apenas o offset local do bounds.
- `solid` ausente e serializado como `true`.
- `bounds` e ordenado por `entityId` para preservar determinismo.
- cenas sem `collision.bounds` retornam `bounds: []`.

## Compatibilidade

- nao altera `RenderSnapshot v1`.
- nao altera `Render SVG v1`, `Canvas2D Demo v1` ou `Browser Playable Demo v1`.
- nao altera `visual.sprite`, `tile.layer` ou `camera.viewport`.
- nao altera `run-loop`, `InputIntent v1`, `KeyboardInputScript v1` ou Save/Load v1.
- o browser demo ainda nao usa `collision.bounds`; ele continua consumindo apenas os drawCalls ja existentes.

## Fora de escopo

- fisica;
- deteccao de colisao entre bounds;
- resolucao de colisao;
- bloqueio de movimento;
- colisao com `tile.layer`;
- pathfinding;
- editor;
- servidor;
- Pixi, Three ou WebGL.
