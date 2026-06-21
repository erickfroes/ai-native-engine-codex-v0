# Portable HTML Export v2

## Objetivo

Escrever um arquivo HTML jogavel e portatil com assets de sprite embutidos como `data:` URL, preservando o caminho simples do `Simple HTML Export v1` e adicionando consumo visual de `Sprite Animation v1` sem alterar `RenderSnapshot v1`.

`Portable HTML Export v2` existe ao lado de `Simple HTML Export v1`:

- `export-html-game` / `export_html_game` continuam sendo o contrato v1;
- `export-portable-html-game` / `export_portable_html_game` introduzem o contrato v2 com assets inline.

## CLI

```bash
node ./engine/runtime/src/cli.mjs export-portable-html-game ./engine/runtime/test/fixtures/sprite-animation-idle.scene.json --asset-manifest ./fixtures/assets/valid.asset-manifest.json --sprite-animation --out ./tmp/sprite-animation-portable-export.html --json
```

Opcoes:

- `--out <file>` e obrigatorio.
- `--asset-manifest <file>` embute assets `image` do `Asset Manifest v1` como `data:` URL em drawCalls `sprite`.
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

O MCP valida `scenePath`, `outputPath` e `assetManifestPath` dentro do repo, escreve o arquivo HTML e retorna o mesmo envelope do CLI em `structuredContent`.

## Regras

- Reutiliza `RenderSnapshot v1`, `createBrowserPlayableDemoMetadataV1` e `renderBrowserPlayableDemoHtmlV1`.
- Nao altera `RenderSnapshot v1`.
- Nao altera `Simple HTML Export v1`.
- `assetManifestPath` continua opt-in.
- Quando `assetManifestPath` esta presente, drawCalls `sprite` recebem `assetSrc` inline como `data:` URL.
- Extensoes inline suportadas neste slice: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.svg`.
- Se um sprite do manifesto apontar para extensao fora dessa lista, runtime/CLI/MCP falham de forma previsivel no contrato v2 sem alterar `Asset Manifest v1`.
- `embeddedAssetCount` conta drawCalls `sprite` efetivamente embutidos com `data:` URL.
- `spriteAnimation` continua opt-in e reutiliza `Sprite Animation v1`.
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

## Compatibilidade

- O HTML exportado continua sem dependencias externas, sem `fetch`, sem servidor e sem scripts remotos.
- O HTML exportado nao usa `file:///` para sprites quando o asset manifest e fornecido; ele carrega apenas `data:` URLs inline.
- `Sprite Animation v1` passa a funcionar no export quando coexistem:
  - `--asset-manifest`
  - drawCalls `sprite` asset-backed
  - `--sprite-animation`
- UI System, Audio Lite, Browser Gameplay HUD Lite e Playable Save/Load Lite continuam opt-ins independentes e podem coexistir com assets inline.

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

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```
