# V1 Small 2D Release Checkpoint

## Status

Status: release checkpoint da V1 Small 2D.

Este checkpoint registra que a engine tem uma base V1 pequena 2D suficiente para criar, validar, testar e exportar um jogo 2D pequeno com os contratos atuais.

Ele nao adiciona feature nova, runtime novo, contrato v2, editor, UI system completo, fisica completa, audio, animation ou pathfinding.

## Capacidades Entregues

- Scene Document v1 validavel por schema e invariantes.
- Runtime headless deterministico com `run-loop`.
- InputIntent v1 e KeyboardInputScript v1 opt-in.
- Save/Load v1 minimo para State Snapshot v1.
- RenderSnapshot v1, Render SVG v1, Canvas2D Demo v1 e Browser Playable Demo v1.
- Asset Manifest v1, `visual.sprite`, `tile.layer` e `camera.viewport`.
- `collision.bounds`, CollisionBoundsReport v1 e CollisionOverlapReport v1.
- Tile Collision v1 e tiles solidos declarativos em `tile.layer`.
- MovementBlockingReport v1.
- Movement blocking opt-in no `run-loop` e na Browser Playable Demo.
- Browser Gameplay HUD Lite opt-in.
- Playable Save/Load Lite browser-local opt-in.
- Simple HTML Export v1 por `export-html-game` e `export_html_game`.
- Game Templates v1 com `top-down-basic` e `side-view-blocking-basic`.
- V1 Small 2D Game Creation Guide / Codex package.

## Contratos V1 Estabilizados

- Scene Document v1.
- SceneValidationReport v1.
- LoopReport v1 e LoopTrace v1.
- InputIntent v1.
- KeyboardInputScript v1.
- State Snapshot v1 e savegame v1 minimo.
- RenderSnapshot v1.
- Asset Manifest v1.
- Visual Components v1.
- Tile Layer v1.
- Camera Viewport v1.
- Collision Bounds v1.
- Collision Overlap v1.
- Tile Collision v1.
- Movement Blocking v1.
- Browser Playable Demo v1.
- Browser Playable Demo Local State v1.
- Simple HTML Export v1.
- Game Templates v1.

Regra de manutencao: estes contratos continuam v1. Mudancas incompativeis devem criar contrato versionado novo, nao mutar v1 em-place.

## Cenas E Templates Disponiveis

- `scenes/v1-small-2d.scene.json`: cena canonica de readiness V1 Small 2D.
- `templates/top-down-basic/scene.json`: sala top-down copiar-e-adaptar.
- `templates/side-view-blocking-basic/scene.json`: cena lateral com blocking simples, sem platformer real.

## Comandos De Validacao

```bash
npm test
npm run validate:scenes
npm run smoke
node ./engine/runtime/src/cli.mjs validate-scene ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs render-snapshot ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --movement-blocking --gameplay-hud --playable-save-load --json
```

## Comandos De Export

```bash
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --out ./tmp/v1-small-2d-release.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/v1-small-2d-release-full.html --json
```

## Decisao Sobre Alias De Release

Nao foi criado um script npm `release:v1-small-2d:check` neste checkpoint.

Motivos:

- a validacao de release precisa cobrir comandos com paths explicitos, arquivos temporarios e templates;
- o repo ja possui scripts canonicos pequenos: `npm test`, `npm run validate:scenes` e `npm run smoke`;
- um alias agregador acrescentaria superficie de manutencao sem ampliar cobertura;
- a sequencia canonica fica documentada em `docs/V1_SMALL_2D_RELEASE_VALIDATION.md`.

Se futuramente um pacote precisar automatizar esse fluxo, ele deve compor comandos existentes sem adicionar dependencia nova.

## Criterio Para Iniciar V2

V2 pode iniciar de forma incremental quando:

- `npm test`, `npm run validate:scenes` e `npm run smoke` passam;
- a cena canonica e os dois templates validam;
- Browser Demo e Simple HTML Export funcionam default e com opt-ins principais;
- a matriz de capacidade e a validacao de release estao atualizadas;
- V1 fica aberta apenas para bugfix, hardening e compatibilidade.

## Fora De Escopo Da V1 Small 2D

- engine AAA;
- fisica completa;
- editor visual;
- UI system completo;
- audio e animation;
- pathfinding;
- multiplayer real;
- servidor;
- prefab system;
- template engine;
- build pipeline V2;
- Pixi, Three, WebGL ou renderer real obrigatorio.

## Proximo Pacote Recomendado

Proxima branch recomendada:

```text
codex/audio-lite-v1
```

Audio Lite v1 deve iniciar a evolucao incremental pos-checkpoint sem reabrir contratos V1 ja estabilizados.
