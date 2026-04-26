# Collision Overlap v1

## Objetivo

Detectar sobreposicoes AABB entre bounds declarados por `collision.bounds` e gerar um relatorio deterministico de diagnostico, sem fisica, resolucao de colisao, bloqueio de movimento, input blocking ou alteracao de renderizacao.

## Fonte de dados

`CollisionOverlapReport v1` deriva de `CollisionBoundsReport v1`.

Isto significa que:

- o input aceito e o mesmo de `buildCollisionBoundsReportV1(sceneOrPath)`;
- `transform + collision.bounds.fields.x/y` ja vem resolvido pelo bounds report;
- validacao de `collision.bounds` continua sendo responsabilidade do contrato existente;
- este pacote nao altera `collision.bounds` nem `CollisionBoundsReport v1`.

## APIs

Runtime:

- `buildCollisionOverlapReportV1(sceneOrPath)`

CLI:

- `inspect-collision-overlaps <scene> [--json]`

MCP:

- `inspect_collision_overlaps`

## Shape

```json
{
  "collisionOverlapReportVersion": 1,
  "scene": "collision-overlap-fixture",
  "overlaps": [
    {
      "entityAId": "player.hero",
      "entityBId": "wall.block",
      "solid": true
    }
  ]
}
```

## Regras

- AABB usa intersecao com area positiva.
- contato apenas na borda nao conta como overlap.
- cada par aparece no maximo uma vez.
- `entityAId` e `entityBId` seguem a ordem deterministica dos bounds por `entityId`.
- a lista final segue a mesma ordem deterministica dos pares gerados.
- `solid` e `true` somente quando os dois bounds do par tem `solid: true`.
- cena sem `collision.bounds` retorna `overlaps: []`.
- cena com bounds, mas sem sobreposicao, retorna `overlaps: []`.
- o algoritmo v1 e par-a-par simples (`O(n^2)`), adequado para fixtures e jogos pequenos 2D nesta fase.

## Compatibilidade

- nao altera `CollisionBoundsReport v1`;
- nao altera `RenderSnapshot v1`;
- nao altera Render SVG, Canvas2D Demo ou Browser Playable Demo;
- nao altera `visual.sprite`, `tile.layer` ou `camera.viewport`;
- nao altera `run-loop`, `InputIntent v1`, `KeyboardInputScript v1` ou Save/Load v1;
- nao move entidades;
- nao bloqueia input;
- nao emite eventos de gameplay.

## Fora de escopo

- fisica;
- resolucao de colisao;
- bloqueio de movimento;
- triggers/eventos;
- broadphase/spatial index;
- colisao com `tile.layer`;
- pathfinding;
- editor;
- servidor;
- Pixi, Three ou WebGL.
