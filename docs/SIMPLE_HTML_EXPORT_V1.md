# Simple HTML Export v1

## Objetivo

Empacotar uma cena jogavel pequena em um unico arquivo HTML autocontido, reutilizando a Browser Playable Demo v1 e seus opt-ins locais.

Este pacote e um export simples para V1 Small 2D. Ele nao e bundler, nao e build pipeline V2, nao cria servidor e nao transforma a Browser Demo no runtime canonico do engine.

## CLI

```bash
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --out ./tmp/v1-small-2d.html --json
```

Opcoes:

- `--out <file>` e obrigatorio.
- `--movement-blocking` embute blocking local da Browser Demo.
- `--gameplay-hud` embute Browser Gameplay HUD Lite.
- `--playable-save-load` embute Playable Save/Load Lite.
- `--json` retorna envelope estavel.

Envelope JSON:

```json
{
  "exportVersion": 1,
  "scene": "v1-small-2d",
  "outputPath": "/abs/tmp/v1-small-2d.html",
  "options": {
    "movementBlocking": true,
    "gameplayHud": true,
    "playableSaveLoad": true
  },
  "sizeBytes": 24000,
  "htmlHash": "sha256hex"
}
```

Sem `--json`, o comando imprime apenas o `outputPath` absoluto.

## Runtime API

- `buildHtmlGameExportV1(sceneOrPath, options)` monta o envelope deterministico e o HTML sem escrever arquivo.
- `exportHtmlGameV1(sceneOrPath, options)` escreve o HTML e retorna o envelope de export.

## MCP

Tool: `export_html_game`

Input:

```json
{
  "scenePath": "./scenes/v1-small-2d.scene.json",
  "outputPath": "./tmp/v1-small-2d.html",
  "movementBlocking": true,
  "gameplayHud": true,
  "playableSaveLoad": true
}
```

O MCP valida `scenePath` e `outputPath` dentro do repo, escreve o arquivo HTML e retorna o mesmo envelope do CLI em `structuredContent`.

## Regras

- Usa `renderBrowserPlayableDemoHtmlV1` e `createBrowserPlayableDemoMetadataV1`.
- Usa `RenderSnapshot v1` como fonte visual.
- Nao altera `RenderSnapshot v1`.
- Nao altera `InputIntent v1`.
- Nao altera `MovementBlockingReport v1`.
- Nao altera `TileCollisionReport v1`.
- Nao altera Browser Demo Local State v1.
- Nao inclui `html` no envelope do export; o HTML fica no arquivo escrito.
- `sizeBytes` e calculado com `Buffer.byteLength(html, "utf8")`.
- `htmlHash` e SHA-256 do HTML escrito.
- As opcoes sao normalizadas com defaults booleanos explicitos.

## Compatibilidade

- O HTML exportado preserva o comportamento da Browser Playable Demo v1.
- Sem flags, o export nao embute `movementBlocking`, `gameplayHud` ou `playableSaveLoad`.
- Com `--movement-blocking`, o movimento local pode ser bloqueado por `collision.bounds` solido e tiles solidos.
- Com `--gameplay-hud`, o HUD Lite local aparece no HTML.
- Com `--playable-save-load`, os controles locais de export/import aparecem no HTML.
- Com as tres opcoes, blocking, HUD e save/load local coexistem no mesmo HTML.

## Fora de escopo

- bundler;
- servidor;
- editor;
- build pipeline V2;
- asset copier ou empacotamento portavel de assets;
- UI system completo;
- fisica completa;
- pathfinding;
- audio ou animation;
- persistencia automatica;
- `localStorage`, `sessionStorage`, `IndexedDB`, rede ou `fetch`;
- scripts externos;
- runtime canonico de gameplay no browser.

## Proximo pacote recomendado

`Game Templates v1` e `V1 Small 2D Game Creation Guide / Codex package` ja foram concluidos sobre este export simples.

O proximo pacote recomendado e `codex/v1-small-2d-release-checkpoint`.
