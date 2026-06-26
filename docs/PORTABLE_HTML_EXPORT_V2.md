# Portable HTML Export v2

## Objetivo

Escrever um arquivo HTML jogavel e portatil com assets de sprite embutidos como `data:` URL, preservando o caminho simples do `Simple HTML Export v1` e adicionando consumo visual opt-in de `Sprite Animation v1` e Atlas/Material Manifest v1 sprite-only sem alterar `RenderSnapshot v1`.

`Portable HTML Export v2` existe ao lado de `Simple HTML Export v1`:

- `export-html-game` / `export_html_game` continuam sendo o contrato v1;
- `export-portable-html-game` / `export_portable_html_game` introduzem o contrato v2 com assets inline.

## CLI

```bash
node ./engine/runtime/src/cli.mjs export-portable-html-game ./engine/runtime/test/fixtures/sprite-animation-idle.scene.json --asset-manifest ./fixtures/assets/valid.asset-manifest.json --sprite-animation --out ./tmp/sprite-animation-portable-export.html --json
```

Exemplo com Atlas/Material Manifest v1 sprite-only:

```bash
node ./engine/runtime/src/cli.mjs export-portable-html-game ./engine/runtime/test/fixtures/atlas-material/atlas-sprite-consumption.scene.json --atlas-material-manifest ./engine/runtime/test/fixtures/atlas-material/starter.atlas-material.json --out ./tmp/atlas-portable-export.html --json
```

Exemplo com UI Production Screens v1:

```bash
node ./engine/runtime/src/cli.mjs export-portable-html-game ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-production-portable.html --json
```

Opcoes:

- `--out <file>` e obrigatorio.
- `--asset-manifest <file>` embute assets `image` do `Asset Manifest v1` como `data:` URL em drawCalls `sprite`.
- `--atlas-material-manifest <file>` resolve sprites atlas-backed pelo `Asset Manifest v1` referenciado no manifesto atlas/material e embute o atlas como `data:` URL.
- `--movement-blocking` embute blocking local da Browser Demo.
- `--gameplay-hud` embute Browser Gameplay HUD Lite.
- `--playable-save-load` embute Playable Save/Load Lite.
- `--audio-lite` embute Audio Lite v1 diagnostico.
- `--sprite-animation` embute `Sprite Animation v1` e anima sprites asset-backed no HTML exportado.
- `--ui-system` embute UI System v1 como overlay visual passivo.
- `--json` retorna envelope estavel.

Envelope JSON:

```json
{
  "exportVersion": 2,
  "scene": "sprite-animation-idle-fixture",
  "outputPath": "/abs/tmp/sprite-animation-portable-export.html",
  "options": {
    "assetManifest": true,
    "movementBlocking": false,
    "gameplayHud": false,
    "playableSaveLoad": false,
    "audioLite": false,
    "spriteAnimation": true,
    "uiSystem": false
  },
  "embeddedAssetCount": 1,
  "sizeBytes": 28000,
  "htmlHash": "sha256hex"
}
```

Sem `--json`, o comando imprime apenas o `outputPath` absoluto.

## Runtime API

- `buildPortableHtmlGameExportV2(sceneOrPath, options)` monta o envelope deterministico e o HTML sem escrever arquivo.
- `exportPortableHtmlGameV2(sceneOrPath, options)` escreve o HTML e retorna o envelope de export.

## MCP

Tool: `export_portable_html_game`

Input:

```json
{
  "scenePath": "./engine/runtime/test/fixtures/sprite-animation-idle.scene.json",
  "outputPath": "./tmp/sprite-animation-portable-export.html",
  "assetManifestPath": "./fixtures/assets/valid.asset-manifest.json",
  "spriteAnimation": true
}
```

O MCP valida `scenePath`, `outputPath`, `assetManifestPath` e `atlasMaterialManifestPath` dentro do repo, escreve o arquivo HTML e retorna o mesmo envelope do CLI em `structuredContent`.

## Regras

- Reutiliza `RenderSnapshot v1`, `createBrowserPlayableDemoMetadataV1` e `renderBrowserPlayableDemoHtmlV1`.
- Nao altera `RenderSnapshot v1`.
- Nao altera `Simple HTML Export v1`.
- Cenas carregadas por path com `entity.prefab` inseguro falham antes da escrita do HTML/export em runtime, CLI e MCP.
- `assetManifestPath` continua opt-in.
- `atlasMaterialManifestPath` tambem e opt-in e e mutuamente exclusivo com `assetManifestPath`.
- Quando `assetManifestPath` esta presente, drawCalls `sprite` recebem `assetSrc` inline como `data:` URL.
- Quando `atlasMaterialManifestPath` esta presente, `visual.sprite.fields.atlasBindingId` corresponde a `sprites[].id`; o export resolve o sprite para o asset do atlas, embute esse atlas como `data:` URL e coloca source rect em `metadata.atlasMaterial`.
- `visual.sprite.fields.assetId` continua obrigatorio e preserva fallback sem manifesto; usar `assetId` como binding logico de atlas e apenas compatibilidade legado.
- `metadata.atlasMaterial` carrega `atlasRegionBindingContractVersion: 1`, `hashAlgorithm: "sha256"`, `bindingHash` e `bindingSource` por sprite.
- `atlasBindingId` ausente no manifesto falha de forma previsivel antes de escrever o HTML.
- Extensoes inline suportadas neste slice: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.svg`.
- Se um sprite do manifesto apontar para extensao fora dessa lista, runtime/CLI/MCP falham de forma previsivel no contrato v2 sem alterar `Asset Manifest v1`.
- `embeddedAssetCount` conta drawCalls `sprite` efetivamente embutidos com `data:` URL.
- `spriteAnimation` continua opt-in e reutiliza `Sprite Animation v1`.
- `spriteAnimation` e `atlasMaterialManifestPath` nao se compoem neste slice e a combinacao falha de forma previsivel.
- `tiles[]` do Atlas/Material Manifest v1 continuam report-only por decisao deste contrato; `tile.layer` permanece renderizado como `rect` pelo snapshot.
- Sem `assetManifestPath`, o export v2 preserva o fallback atual da Browser Demo/export simples.
- Sem `assetManifestPath`, `--sprite-animation` pode manter `metadata.spriteAnimation`, mas os drawCalls continuam no fallback atual `rect`, sem `data:` URL inline e sem `file:///`.
- Sem `assetManifestPath`, se a cena nao tiver qualquer componente visual renderizavel e o snapshot final ficar com `drawCalls: []`, `--sprite-animation` continua no-op completo: `metadata.spriteAnimation` pode existir com arrays vazios, `embeddedAssetCount` fica `0` e o HTML preserva `drawCalls` vazios, sem `data:` URL inline e sem `file:///`.
- Mesmo com `assetManifestPath`, se a cena nao produzir drawCalls `sprite` asset-backed compativeis, `--sprite-animation` continua como no-op visual: `metadata.spriteAnimation` pode permanecer, `embeddedAssetCount` fica `0` e o HTML segue em fallback `rect`, sem `data:` URL inline e sem `file:///`.
- Mesmo com `assetManifestPath`, se a cena nao produzir drawCalls `sprite` asset-backed compativeis e tambem nao declarar `visual.sprite.animation` (ex.: cena com `sprite` legado), `--sprite-animation` continua como no-op completo: `metadata.spriteAnimation` pode existir com `animations: []`, `warnings: []` e `invalidRefs: []`, `embeddedAssetCount` fica `0` e o HTML segue em fallback `rect`, sem `data:` URL inline e sem `file:///`.
- Mesmo com `assetManifestPath`, se a cena for puramente `rect` e nao tiver qualquer componente de sprite (ex.: `tile.layer` sem `sprite`, `visual.sprite` ou `visual.sprite.animation`), `--sprite-animation` continua no-op completo: `metadata.spriteAnimation` pode existir com arrays vazios, `embeddedAssetCount` fica `0` e o HTML preserva apenas drawCalls `rect`, sem `data:` URL inline e sem `file:///`.
- Mesmo com `assetManifestPath`, se a cena nao tiver qualquer componente visual renderizavel e o snapshot final ficar com `drawCalls: []`, `--sprite-animation` continua no-op completo: `metadata.spriteAnimation` pode existir com arrays vazios, `embeddedAssetCount` fica `0` e o HTML preserva `drawCalls` vazios, sem `data:` URL inline e sem `file:///`.
- Mesmo com `assetManifestPath`, se a cena tiver `visual.sprite` asset-backed mas nao declarar `visual.sprite.animation`, `--sprite-animation` continua como no-op de animacao: `metadata.spriteAnimation` pode existir com `animations: []`, `embeddedAssetCount` continua contando os sprites inline e o HTML preserva drawCalls `sprite` normais, sem `file:///`.
- `sizeBytes` e calculado com `Buffer.byteLength(html, "utf8")`.
- `htmlHash` e SHA-256 do HTML escrito.
- `--ui-system` embute `metadata.uiSystem` e o overlay passivo de UI System v1; na fixture `scenes/ui-production-screens.scene.json`, telas inativas entram no metadata/report mas nao geram DOM visual.

## Compatibilidade

- O HTML exportado continua sem dependencias externas, sem `fetch`, sem servidor e sem scripts remotos.
- O HTML exportado nao usa `file:///` para sprites quando o asset manifest e fornecido; ele carrega apenas `data:` URLs inline.
- `Sprite Animation v1` passa a funcionar no export quando coexistem:
  - `--asset-manifest`
  - drawCalls `sprite` asset-backed
  - `--sprite-animation`
- UI System, Audio Lite, Browser Gameplay HUD Lite e Playable Save/Load Lite continuam opt-ins independentes e podem coexistir com assets inline; `ui.screen` nao substitui HUD Lite nem save/load local.
- Atlas/Material Manifest v1 pode coexistir com UI System, Audio Lite, HUD Lite e Playable Save/Load Lite, mas nao com Sprite Animation v1 neste slice.

## Fora de escopo

- bundler;
- servidor;
- editor;
- atlas pipeline;
- deduplicacao estrutural de blobs inline entre drawCalls;
- build pipeline V2 mais ampla;
- runtime canonico de gameplay no browser;
- mutacao de `Simple HTML Export v1` em lugar.

## Validacao

Cobertura dedicada:

- `engine/runtime/test/portable-html-export-v2.test.mjs`;
- `engine/runtime/test/browser-playable-demo-runtime.test.mjs`;
- `engine/runtime/test/cli-render-browser-demo.test.mjs`;
- `engine/runtime/test/simple-html-export-v1.test.mjs`;
- `tools/mcp-server/test/mcp-server.test.mjs`.

Cobertura de seguranca de prefab:

- `entity.prefab` com traversal, URL ou paths absolutos/UNC falha de forma previsivel antes de gerar HTML portatil;
- runtime, CLI e MCP preservam `SceneValidationError` para esse caso.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```
