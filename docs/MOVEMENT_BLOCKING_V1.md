# Movement Blocking v1

## Objetivo

Inspecionar uma tentativa de movimento declarada por `InputIntent v1` e reportar se ela seria bloqueada por overlaps sólidos entre `collision.bounds`, com aplicação opcional no `run-loop` apenas quando explicitamente habilitada.

## Fonte de dados

`MovementBlockingReport v1` combina:

- a cena validada;
- `collision.bounds` via `CollisionBoundsReport v1`;
- um `InputIntent v1` com action `move`.

O report nao altera `CollisionBoundsReport v1` nem `CollisionOverlapReport v1`.

## APIs

Runtime:

- `buildMovementBlockingReportV1(sceneOrPath, { inputIntent })`

CLI:

- `inspect-movement-blocking <scene> --input-intent <path> [--json]`

MCP:

- `inspect_movement_blocking`

## Shape

```json
{
  "movementBlockingReportVersion": 1,
  "scene": "movement-blocking-blocked-fixture",
  "entityId": "player.hero",
  "inputIntentTick": 1,
  "attemptedMove": { "x": 1, "y": 0 },
  "from": { "x": 0, "y": 0 },
  "candidate": { "x": 1, "y": 0 },
  "final": { "x": 0, "y": 0 },
  "blocked": true,
  "blockingEntities": ["wall.block"]
}
```

## Regras

- `inputIntent.entityId` identifica a entidade que tenta mover.
- `attemptedMove` soma actions `move` do `InputIntent v1`.
- `from` vem do `transform` atual da entidade; sem `transform`, usa `0,0`.
- `candidate` e `from + attemptedMove`.
- o bounds candidato usa o bounds atual da entidade deslocado por `attemptedMove`.
- apenas outros bounds com `solid: true` bloqueiam.
- se o bounds da entidade movida for `solid: false`, a tentativa nao bloqueia.
- `blockingEntities` e ordenado por `entityId`.
- se `blocked` for `true`, `final` permanece igual a `from`.
- se `blocked` for `false`, `final` e igual a `candidate`.
- se a entidade nao tiver `collision.bounds`, o report nao bloqueia e ainda retorna a posicao candidata.
- o algoritmo v1 e uma varredura simples sobre bounds (`O(n)` contra os bounds da cena), adequada para V1 small 2D.

## Bordas previsiveis

- entidade alvo ausente falha de forma previsivel no runtime, CLI e MCP.
- sem `transform`, `from` usa `0,0`.
- sem `collision.bounds` na entidade alvo, a tentativa nao bloqueia porque nao ha bounds candidato.
- action `move` ausente ou eixo `0,0` produz `attemptedMove: { "x": 0, "y": 0 }`.
- multiplos blockers solidos aparecem em `blockingEntities` ordenados por `entityId`.
- `inputIntent` invalido falha via validador de `InputIntent v1` nos fluxos CLI/MCP.
- paths inexistentes de cena ou input intent falham como erro de arquivo previsivel.

## Compatibilidade

- `run-loop` / `run_loop` continuam iguais por padrão (flag/opção ausente);
- com `movementBlocking` (`run-loop` CLI/MCP), só o movimento derivado de `InputIntent v1` é bloqueado;
- sem `movementBlocking`, o comportamento permanece exatamente igual;
- nao altera Browser Playable Demo;
- nao altera `InputIntent v1` ou `KeyboardInputScript v1`;
- nao altera `CollisionBoundsReport v1`;
- nao altera `CollisionOverlapReport v1`;
- nao altera `RenderSnapshot v1`, Render SVG, Canvas2D Demo ou Browser Playable Demo;
- nao altera `visual.sprite`, `tile.layer`, `camera.viewport` ou Save/Load v1.
- tile.collision ainda não está em escopo neste pacote.

## Fora de escopo

- aplicar movimento no estado canonico;
- resolver fisica;
- empurrar ou separar entidades;
- bloquear input em runtime sem flag/opção;
- colisao com `tile.layer`;
- pathfinding;
- editor;
- servidor;
- Pixi, Three ou WebGL.
