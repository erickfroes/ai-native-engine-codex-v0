# Audio Lite v1

## Objetivo

Audio Lite v1 inicia a linha incremental pos V1 Small 2D checkpoint com audio simples, declarativo e seguro para cenas pequenas.

Ele permite declarar clips de audio em uma cena, inspecionar um plano deterministico e, quando pedido por opt-in, embutir controles diagnosticos na Browser Playable Demo e no Simple HTML Export.

Audio Lite v1 nao e mixer completo, nao e audio graph, nao e spatial audio, nao e streaming e nao toca audio no runtime headless.

## Componente

Componente: `audio.clip`

Shape minimo:

```json
{
  "kind": "audio.clip",
  "version": 1,
  "replicated": false,
  "fields": {
    "clipId": "sfx.step",
    "kind": "sfx",
    "src": "audio/step.wav",
    "volume": 1,
    "loop": false,
    "trigger": "onMove"
  }
}
```

Regras:

- `kind` fixo do componente: `audio.clip`.
- `version` deve ser `1`.
- `replicated` deve ser `false`.
- `fields.clipId` e obrigatorio e deve ser string nao vazia.
- `fields.kind` e obrigatorio e deve ser `sfx` ou `music`.
- `fields.src` e opcional; quando presente deve ser path relativo seguro, sem URL, path absoluto ou traversal.
- `fields.volume` e opcional; default de report/browser e `1`; quando presente deve estar entre `0` e `1`.
- `fields.loop` e opcional; default de report/browser e `false`.
- `fields.trigger` e opcional; default de report/browser e `manual`.
- triggers permitidos: `onDemoStart`, `onMove`, `onBlockedMove`, `manual`.
- sem campos extras.

## AudioLiteReport v1

Runtime API:

```js
buildAudioLiteReportV1(sceneOrPath)
```

Shape:

```json
{
  "audioLiteReportVersion": 1,
  "scene": "audio-lite-sfx",
  "clips": [
    {
      "entityId": "audio.step",
      "clipId": "sfx.step",
      "kind": "sfx",
      "trigger": "onMove",
      "volume": 1,
      "loop": false,
      "src": null
    }
  ],
  "triggers": [
    {
      "trigger": "onMove",
      "clipIds": ["sfx.step"]
    }
  ],
  "warnings": [
    {
      "code": "AUDIO_CLIP_SRC_MISSING",
      "entityId": "audio.step",
      "clipId": "sfx.step",
      "message": "audio.clip src is missing; browser playback will use silent diagnostic fallback"
    }
  ],
  "invalidRefs": []
}
```

Regras:

- a ordem de `clips` e deterministica por `clipId`, depois `entityId`;
- a ordem de `triggers` segue `onDemoStart`, `onMove`, `onBlockedMove`, `manual`;
- `src` ausente gera warning, mas nao falha;
- `src` apontando para arquivo inexistente gera `invalidRefs` e warning, mas nao falha;
- trigger invalido e shape invalido falham na validacao da cena;
- cena sem `audio.clip` retorna `clips: []`, `triggers: []`, `warnings: []` e `invalidRefs: []`.

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-audio-lite ./scenes/v1-small-2d.scene.json --json
```

O CLI retorna `AudioLiteReport v1`. Sem `--json`, imprime resumo legivel e estavel.

## MCP

Tool: `inspect_audio_lite`

Input:

```json
{
  "path": "./scenes/v1-small-2d.scene.json"
}
```

Output: o mesmo shape do `AudioLiteReport v1` em `structuredContent`.

## Browser Demo e Export

- `render-browser-demo --audio-lite` embute metadata e controles locais de Audio Lite.
- `render_browser_demo({ audioLite: true })` faz o mesmo via MCP.
- `export-html-game --audio-lite` escreve HTML autocontido com Audio Lite diagnostico.
- `export_html_game({ audioLite: true })` faz o mesmo via MCP.
- sem opt-in, a Browser Demo e o export permanecem sem metadata/controles de audio.

No browser, Audio Lite v1:

- nao forca autoplay;
- so inicializa audio apos gesto do usuario;
- cai para fallback silencioso/diagnostico se o browser bloquear audio;
- nao usa `fetch`, rede, storage, scripts externos ou imports dinamicos;
- nao altera `RenderSnapshot v1`, `run-loop`, save/load, movement blocking ou tile collision.

## Fora de escopo

- mixer completo;
- audio graph;
- spatial audio;
- streaming;
- timeline;
- editor;
- UI system completo;
- runtime headless tocando audio;
- Asset Manifest v1 para audio;
- sprite animation.

## Proximo pacote recomendado

`codex/sprite-animation-v1`.
