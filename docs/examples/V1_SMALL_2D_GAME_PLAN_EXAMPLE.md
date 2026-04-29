# V1 Small 2D Game Plan Example

## Micro Top-Down Room Escape

Este exemplo mostra como o Codex deve planejar um microjogo sem criar feature nova de engine.

## Premissa

O player esta em uma sala pequena e precisa alcancar um marcador visual de saida. Alguns tiles solidos bloqueiam caminhos. O jogo usa apenas movement blocking opt-in, fallback visual e export HTML.

## Template base

Use `templates/top-down-basic`.

## Entidades

- `player.hero`: entidade controlavel com `transform`, `visual.sprite` e `collision.bounds`.
- `map.room`: `tile.layer` pequeno com paredes e obstaculos solidos.
- `goal.marker`: marcador visual nao solido.
- `camera.main`: `camera.viewport` pequeno acompanhando a composicao inicial de forma estatica.

## Regras de gameplay

- O player move em passos locais da Browser Demo.
- Movement blocking e opt-in.
- Obstaculos solidos bloqueiam o movimento quando `--movement-blocking` esta ativo.
- O objetivo e apenas visual; nao ha sistema de vitoria ainda.

## Intents de teste

- `input/move-right.intent.json`: tenta mover para obstaculo solido e deve bloquear.
- `input/move-down.intent.json`: move em caminho livre e deve passar.

## Comandos de validacao

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./tmp/room-escape/scene.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/room-escape/scene.json --input-intent ./tmp/room-escape/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/room-escape/scene.json --input-intent ./tmp/room-escape/input/move-down.intent.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./tmp/room-escape/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/room-escape.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./tmp/room-escape/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/room-escape-export.html --json
```

## Nao fazer

- Nao adicionar combate.
- Nao adicionar inventario.
- Nao adicionar NPC.
- Nao adicionar pathfinding.
- Nao adicionar fisica.
- Nao adicionar gravidade ou jump.
- Nao adicionar multiplas cenas.
- Nao adicionar UI system completo.
- Nao transformar `goal.marker` em sistema de vitoria neste pacote.

## Entrega esperada

- Um diretorio pequeno de jogo derivado do template.
- `scene.json` validavel.
- Dois intents locais.
- README curto do jogo.
- Browser Demo geravel.
- HTML exportavel.
- Checklist V1 completo.
