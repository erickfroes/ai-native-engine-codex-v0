# Audio Event Bank Manifest v1

## Objetivo

Audio Event Bank Manifest v1 abre a trilha de `Audio v1 de jogo pequeno` com o menor contrato novo defensável: um manifesto externo, report-only e opt-in, que organiza `audio.clip` já declarados em bancos/eventos pequenos sem mutar `AudioLiteReport v1`, Browser Demo, exports ou o runtime headless.

Ele existe para:

- dar nomes estáveis de jogo para feedback pequeno de menu/gameplay;
- publicar uma cena canônica de áudio em `scenes/`;
- expor runtime, CLI e MCP alinhados antes de qualquer consumo novo em HTML.

Audio Event Bank Manifest v1 não toca áudio, não faz mixer, não faz streaming, não embute assets e não consome `src` no browser.

## Manifesto

Arquivo externo `.audio-event-bank.json`.

Shape mínimo:

```json
{
  "audioEventBankManifestVersion": 1,
  "metadata": {
    "name": "audio-game-feedback-bank"
  },
  "scenePath": "./audio-game-feedback.scene.json",
  "banks": [
    {
      "bankId": "menu",
      "events": [
        {
          "eventId": "ui.navigate",
          "clipIds": ["sfx.ui.navigate"]
        }
      ]
    }
  ]
}
```

Schema formal:

- `docs/schemas/audio-event-bank-manifest-v1.schema.json`

Regras:

- `scenePath` e relativo seguro ao diretorio do manifesto;
- `scenePath` deve apontar para `.scene.json`;
- `bankId` deve ser unico por manifesto;
- `eventId` deve ser unico dentro do banco;
- `clipIds[]` deve conter strings nao vazias, sem duplicidade no mesmo evento;
- cada `clipId` referenciado deve existir entre os `audio.clip` da cena;
- o manifesto nao altera a cena, `audio.clip` ou `AudioLiteReport v1`.

## AudioEventBankReport v1

Runtime API:

```js
buildAudioEventBankReportV1(manifestPath)
```

Schema formal:

- `docs/schemas/audio-event-bank-report-v1.schema.json`

Shape resumido:

```json
{
  "audioEventBankReportVersion": 1,
  "ok": true,
  "absolutePath": "/repo/scenes/audio-game-feedback.audio-event-bank.json",
  "sceneAbsolutePath": "/repo/scenes/audio-game-feedback.scene.json",
  "scene": "audio-game-feedback",
  "summary": {
    "bankCount": 2,
    "eventCount": 6,
    "sceneClipCount": 5,
    "referencedClipCount": 5,
    "unreferencedClipCount": 0
  },
  "sceneAudio": {
    "clips": [],
    "warnings": [],
    "invalidRefs": []
  },
  "banks": [],
  "errors": [],
  "warnings": []
}
```

Regras:

- `sceneAudio` reaproveita a leitura de `Audio Lite v1` para clips/defaults/warnings;
- `warnings` do report preservam avisos de `audio.clip` e clips orfaos nao referenciados por bancos/eventos;
- `errors` cobrem manifesto ausente/malformado, path inseguro e `clipId` inexistente;
- `ok` so e `true` quando o manifesto e a cena de audio estao consistentes.

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-audio-event-bank ./scenes/audio-game-feedback.audio-event-bank.json --json
```

Sem `--json`, o CLI imprime um resumo legivel de bancos, eventos, erros e warnings.

## MCP

Tool: `inspect_audio_event_bank`

Input:

```json
{
  "path": "./scenes/audio-game-feedback.audio-event-bank.json"
}
```

Output: `AudioEventBankReport v1` em `structuredContent`.

## Fixture publica

- cena: `scenes/audio-game-feedback.scene.json`
- manifesto: `scenes/audio-game-feedback.audio-event-bank.json`

A cena publica continua pequena, usa apenas `audio.clip` v1, inclui menu com `ui.action.semantics`, um player simples e clips de menu/gameplay suficientes para auditar `scene.start`, `ui.navigate`, `ui.activate`, `player.move`, `player.blocked` e `manual.preview`.

## Fora de escopo

- Browser Demo consumindo o manifesto;
- exports HTML consumindo o manifesto;
- tocar `src` real no browser;
- inline de audio no export portatil;
- mixer completo, spatial audio, streaming, timeline ou savegame de audio;
- novo componente de cena para audio.

## Proximo pacote recomendado

`Audio Browser Preview v1`: consumir `AudioEventBankReport v1` na Browser Demo com preview local, paridade de report e budget de HTML, ainda sem assets reais e sem expandir exports.
