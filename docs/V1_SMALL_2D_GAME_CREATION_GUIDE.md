# V1 Small 2D Game Creation Guide

## Objetivo

Este guia fecha o fluxo Codex-first para criar um jogo pequeno 2D usando apenas capacidades V1 ja existentes.

Ele e uma camada de workflow sobre Game Templates v1, Browser Playable Demo v1, Playable Save/Load Lite e Simple HTML Export v1. Ele nao adiciona runtime, schema, CLI, MCP, template engine, prefab system ou editor.

## Escolha do template

Use `templates/top-down-basic` quando o jogo for uma sala vista de cima, com paredes, obstaculos e um objetivo visual simples.

Use `templates/side-view-blocking-basic` quando o jogo tiver leitura lateral simples, com piso/obstaculos, mas sem gravidade, jump ou fisica. Nao chame esse template de platformer real.

## Fluxo canonico

1. Escolha `top-down-basic` ou `side-view-blocking-basic`.
2. Copie o diretorio do template para um diretorio de prototipo, por exemplo `tmp/my-small-game`.
3. Renomeie `metadata.name` e ajuste `metadata.tags`.
4. Adapte primeiro `tile.layer.fields.tiles`, mantendo o mapa pequeno.
5. Ajuste `player.hero.transform`, `camera.viewport` e um marcador visual nao solido.
6. Atualize os intents em `input/` para manter um caminho bloqueado e um caminho livre.
7. Valide a cena.
8. Teste movement blocking nos dois intents.
9. Gere Browser Demo default e Browser Demo com opt-ins.
10. Exporte HTML default e HTML com todos os opt-ins.
11. Rode a validacao final obrigatoria.

## Regras de adaptacao

- Preserve `systems: ["core.loop", "input.keyboard"]`.
- Preserve uma entidade controlavel, preferencialmente `player.hero`.
- Preserve exatamente uma `camera.viewport` pequena.
- Preserve pelo menos um `tile.layer`.
- Preserve `collision.bounds` no player.
- Mantenha fallback visual deterministico com `visual.sprite` ou retangulos.
- Mantenha um intent bloqueado e um intent livre.
- Mantenha os mapas pequenos o bastante para leitura manual e export HTML leve.
- Use `empty` para fundo/piso sempre que possivel; cada tile nao vazio vira 1 drawCall.
- Use `solid: true` apenas para bloqueio de gameplay; cada tile solido tambem vira blocker serializado para input local.
- Prefira alterar dados da cena antes de pensar em comportamento novo.
- Se precisar de asset real, use os fluxos opt-in de Asset Manifest existentes; nao crie pipeline de assets neste guia.

## Visual, camera e assets

- Fallback `rect` e o baseline visual dos templates.
- `render-browser-demo --asset-manifest` pode servir para preview local de sprites reais.
- `export-html-game` nao empacota Asset Manifest nem copia assets reais; hoje ele entrega o HTML autocontido baseado no snapshot/fallback.
- Se a intencao for manter preview e export parecidos, declare `visual.sprite.fields.width` e `height` explicitamente.
- `camera.viewport` aplica apenas `screen = world - camera`.
- `camera.viewport` nao faz culling, follow target, zoom ou reducao automatica de drawCalls.
- Mudar camera, `tileWidth`, `tileHeight` ou blockers exige revalidar `render-snapshot`, Browser Demo e movement blocking.
- A Browser Demo escolhe o controlavel por metadata/fallback deterministico; mantenha `player.hero` como primeiro drawable jogavel e evite decoracao renderizavel antes dele.
- O passo local da Browser Demo e `4 px`; alinhe tiles, bounds e probes de blocking a esse passo.

## O que nao usar neste guia

- `entity.prefab`: reservado no formato, mas sem semantica de prefab neste workflow.
- sistemas novos;
- template engine;
- prefab system;
- editor;
- fisica;
- gravidade;
- jump/platformer real;
- pathfinding;
- combate;
- inventario;
- UI system completo;
- audio ou animation;
- servidor;
- bundler ou build pipeline V2.

## Validar cena

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./tmp/my-small-game/scene.json --json
```

## Validar intents

```bash
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-down.intent.json --json
```

## Testar bloqueio e caminho livre

```bash
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-down.intent.json --json
```

O intent bloqueado deve retornar `blocked: true` e listar o tile ou entidade bloqueadora. O intent livre deve retornar `blocked: false`.

## Gerar Browser Demo

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./tmp/my-small-game/scene.json --out ./tmp/my-small-game.html --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-full.html --json
```

Sem flags, a Browser Demo preserva movimento local livre. Com `--movement-blocking`, ela aplica blocking local. Com `--gameplay-hud`, ela mostra o HUD Lite local. Com `--playable-save-load`, ela mostra export/import JSON local no HTML.

## Exportar HTML

```bash
node ./engine/runtime/src/cli.mjs export-html-game ./tmp/my-small-game/scene.json --out ./tmp/my-small-game-export.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-export-full.html --json
```

O export e um HTML autocontido baseado na Browser Playable Demo. Ele nao e bundler, servidor, asset copier ou runtime canonico de gameplay.

O export e snapshot de cena em HTML. A validacao autoritativa de gameplay continua sendo `inspect-movement-blocking` e, quando aplicavel, `run-loop --movement-blocking`.

## Checklist rapido

- `validate-scene` retorna cena valida.
- `validate-input-intent` passa para os intents locais.
- `inspect-movement-blocking` cobre um caminho bloqueado e um caminho livre.
- `render-snapshot` gera drawCalls deterministicas.
- `render-snapshot` permanece estavel entre execucoes para o mesmo input.
- `run-replay` pode ser usado como smoke de loop, mas nao substitui `render-snapshot` e `inspect-movement-blocking` para validar tiles, camera e blocking.
- `render-browser-demo` funciona sem flags.
- `render-browser-demo --movement-blocking --gameplay-hud --playable-save-load` funciona.
- `export-html-game` escreve HTML default.
- `export-html-game --movement-blocking --gameplay-hud --playable-save-load` escreve HTML completo.
- O HTML nao usa `fetch`, storage, scripts externos, imports dinamicos ou relogios de wall-clock.
- O jogo respeita os budgets de drawCalls, blockers e sizeBytes.

## Budgets e determinismo

Trate os budgets como hard ceiling, nao como meta confortavel.

- `top-down-basic` baseline atual: 50 drawCalls, 25 blockers solidos, 30597 B no export HTML com todos os opt-ins.
- `top-down-basic` teto V1: 64 drawCalls, 32 blockers solidos, 32000 B.
- `side-view-blocking-basic` baseline atual: 15 drawCalls, 11 blockers solidos, 26774 B no export HTML com todos os opt-ins.
- `side-view-blocking-basic` teto V1: 32 drawCalls, 16 blockers solidos, 32000 B.

Gates de determinismo para jogos derivados:

- `run-replay` como smoke de loop.
- `render-snapshot` estavel para cobrir tiles, camera e ordenacao de drawCalls.
- `inspect-movement-blocking` para caminho bloqueado e caminho livre.
- `export-html-game --json` estavel para confirmar `sizeBytes` e `htmlHash`.

## Validacao final obrigatoria

Primeiro rode o gate do jogo criado, apontando para o diretorio real do prototipo:

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./tmp/my-small-game/scene.json --json
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs validate-input-intent ./tmp/my-small-game/input/move-down.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-right.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./tmp/my-small-game/scene.json --input-intent ./tmp/my-small-game/input/move-down.intent.json --json
node ./engine/runtime/src/cli.mjs render-snapshot ./tmp/my-small-game/scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-full.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./tmp/my-small-game/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/my-small-game-export-full.html --json
```

Depois rode a baseline do repositorio:

```bash
npm test
npm run validate:scenes
npm run smoke
```

`npm run validate:scenes` valida `./scenes`; ele nao descobre automaticamente um prototipo copiado para `tmp/` ou outro diretorio. Por isso o gate do jogo criado deve ser explicito.

## MCP minimo

Quando o fluxo for conduzido por MCP, use as tools existentes para espelhar o gate principal:

- `validate_scene` com `path`.
- `validate_input_intent` com `path`.
- `inspect_movement_blocking` com `path` e `inputIntentPath`.
- `render_snapshot` com `path`.
- `render_browser_demo` com `path`, `movementBlocking`, `gameplayHud` e `playableSaveLoad`.
- `export_html_game` com `scenePath`, `outputPath`, `movementBlocking`, `gameplayHud` e `playableSaveLoad`.

## Saida esperada

Ao fim, o jogo V1 pequeno deve ter:

- cena pequena e validavel;
- player controlavel;
- mapa pequeno com tile.layer;
- blocking opt-in testado;
- fallback visual deterministico;
- Browser Demo jogavel;
- HTML exportado;
- Playable Save/Load Lite local opcional;
- docs curtas do que foi adaptado.

## Proximo pacote recomendado

Depois deste guia, do V1 Small 2D Release Checkpoint e de Audio Lite v1, o proximo pacote recomendado e `codex/sprite-animation-v1`.
