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

Geometria canônica:

- `camera.main` usa offset world `(4, 0)` e viewport `32x24`.
- `player.hero` nasce em world `(4, 8)`, portanto aparece no Browser Demo em screen `(0, 8)`.
- o tile solido `map.ground.tile.2.3` nasce em world `(12, 8)`, portanto aparece em screen `(8, 8)`.
- com `movementBlocking` ligado, `ArrowRight` tenta mover o player para o tile solido e e bloqueado.
- `ArrowDown` permanece caminho livre e move o player para screen `(0, 12)` na Browser Demo.

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
- `render-browser-demo --gameplay-hud` expoe HUD Lite local sem alterar o comportamento padrao.
- `render-browser-demo --gameplay-hud --movement-blocking` expoe contadores locais de blocking no HTML.
- `render-browser-demo --playable-save-load` expoe export/import manual local sem alterar o comportamento padrao.
- `render-browser-demo --gameplay-hud --movement-blocking --playable-save-load` prova que HUD, blocking e save/load local coexistem.
- a cobertura atual tambem inclui `playableSaveLoad` isolado e combinado com `gameplayHud` e `movementBlocking`.
- a Browser Demo da cena canônica cobre as combinacoes sem flags, `movementBlocking`, `gameplayHud` e `gameplayHud + movementBlocking`.
- o HTML gerado permanece autocontido e sem APIs proibidas como `fetch`, `localStorage`, timers de relogio, scripts externos ou imports dinamicos.
- os envelopes CLI/MCP preservam `browserDemoVersion`, `scene`, `tick` e `html`; `outputPath` aparece apenas no CLI quando `--out` e usado.

## Fora De Escopo

- fisica completa;
- resolucao complexa;
- pathfinding;
- editor;
- audio;
- animation;
- UI system completo;
- servidor;
- Pixi, Three ou WebGL;
- mudanca em contratos v1 existentes.

## Seguimento

`Browser Gameplay HUD Lite v1`, Playable Save/Load Lite v1 e o hardening dos exemplos jogaveis pequenos ja complementam este gate expondo estado minimo de gameplay na Browser Playable Demo.

Esse HUD Lite continua opt-in, local ao HTML e nao transforma a Browser Demo no runtime canonico do engine.

Playable Save/Load Lite tambem continua opt-in, local ao HTML e nao substitui `savegame v1`, `State Snapshot v1`, `save-state` ou `load-save`.

O proximo pacote recomendado e `Simple HTML Export v1` para empacotar a demo jogavel pequena sem criar editor, servidor ou sistema de build amplo.
