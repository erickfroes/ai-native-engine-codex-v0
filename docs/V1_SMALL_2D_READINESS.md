# V1 Small 2D Readiness

## Objetivo

Fechar um gate minimo de prontidao para V1 Small 2D sem adicionar sistema novo.

Este gate prova que uma cena pequena consegue usar, em conjunto:

- `visual.sprite` com fallback `rect`;
- `tile.layer`;
- `camera.viewport`;
- `collision.bounds`;
- tiles solidos;
- player controlavel;
- caminho bloqueado e caminho livre;
- runtime, CLI e MCP alinhados.

## Cena Canonica

Cena: `scenes/v1-small-2d.scene.json`

Elementos:

- `player.hero`: `transform`, `visual.sprite` e `collision.bounds` solido.
- `map.ground`: `tile.layer` pequeno com um tile solido em `map.ground.tile.2.3`.
- `camera.main`: `camera.viewport` com offset `world - camera`.
- `ghost.trigger`: bounds nao solido sobreposto ao player para validar overlap diagnostico sem bloquear.
- `wall.block`: bounds solido distante para validar bounds solidos sem interferir no caminho livre.

Inputs:

- `fixtures/input/v1-small-2d-move-right.intent.json`: movimento para direita, bloqueado pelo tile solido.
- `fixtures/input/v1-small-2d-move-down.intent.json`: movimento para baixo, caminho livre.

## Gate De Readiness

O gate passa quando:

- `npm run validate:scene -- ./scenes/v1-small-2d.scene.json` e valido.
- `npm run validate:scenes` inclui a cena consolidada.
- `render-snapshot` gera drawCalls deterministicas com camera aplicada.
- `render-browser-demo` sem `--movement-blocking` preserva movimento local livre.
- `render-browser-demo --movement-blocking` embute blocking local no HTML.
- `inspect-collision-bounds` lista bounds solidos e nao solidos em ordem deterministica.
- `inspect-collision-overlaps` reporta o trigger nao solido sobreposto sem tratar como fisica.
- `inspect-tile-collision` lista o tile solido declarativo.
- `inspect-movement-blocking` bloqueia o movimento para direita e permite o movimento para baixo.
- `run-loop` sem `movementBlocking` preserva o comportamento padrao.
- `run-loop --movement-blocking` bloqueia apenas quando a tentativa seria solida.
- runtime, CLI e MCP permanecem alinhados.

## Fora De Escopo

- fisica completa;
- resolucao complexa;
- pathfinding;
- editor;
- audio;
- animation;
- UI/HUD jogavel;
- servidor;
- Pixi, Three ou WebGL;
- mudanca em contratos v1 existentes.

## Proximo Passo Recomendado

O proximo pacote recomendado e `Browser Gameplay HUD Lite v1`.

Esse pacote deve expor estado minimo de gameplay na Browser Playable Demo sem transformar a Browser Demo no runtime canonico do engine.
