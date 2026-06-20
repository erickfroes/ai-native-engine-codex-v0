# Sprite Animation v1

Sprite Animation v1 e um contrato declarativo minimo para descrever animacoes de sprites em cenas pequenas sem introduzir runtime visual novo.

O objetivo deste pacote e fechar o primeiro slice diagnostico:

- componente `visual.sprite.animation` v1 no Scene Document;
- `SpriteAnimationReport v1` deterministico;
- runtime, CLI e MCP alinhados;
- fixtures validas e invalidas;
- testes cross-interface.

## Componente

`visual.sprite.animation` e opt-in, nao replicado e versionado:

```json
{
  "kind": "visual.sprite.animation",
  "version": 1,
  "replicated": false,
  "fields": {
    "animationId": "player.idle",
    "assetId": "player.sprite",
    "frameWidth": 16,
    "frameHeight": 16,
    "frames": [
      { "x": 0, "y": 0 },
      { "x": 16, "y": 0 }
    ],
    "fps": 8,
    "loop": true,
    "state": "idle"
  }
}
```

Campos obrigatorios:

- `animationId`: string nao vazia;
- `assetId`: string nao vazia;
- `frameWidth` e `frameHeight`: inteiros `>= 1`;
- `frames`: array nao vazio de `{ x, y }`;
- `fps`: inteiro entre `1` e `60`.

Campos opcionais:

- `loop`: booleano, default diagnostico `true`;
- `state`: string nao vazia, default diagnostico `default`.

## Report

`buildSpriteAnimationReportV1(sceneOrPath)` retorna:

```json
{
  "spriteAnimationReportVersion": 1,
  "scene": "sprite-animation-idle-fixture",
  "animations": [],
  "warnings": [],
  "invalidRefs": []
}
```

Cada animacao normalizada inclui:

- `entityId`;
- `animationId`;
- `assetId`;
- `frameWidth`;
- `frameHeight`;
- `fps`;
- `loop`;
- `state`;
- `frames` com `x`, `y` e `index`.

Ordenacao: `animations` sao ordenadas por `animationId` e depois `entityId`.

## Regras

- arquivos de cena passam por `validateSceneFile` antes do report;
- objetos de cena em memoria passam por invariantes estruturais antes do report;
- `assetId` da animacao deve existir em algum componente `visual.sprite` da cena;
- quando esse asset nao aparece em `visual.sprite`, o report continua sendo gerado e adiciona `SPRITE_ANIMATION_ASSET_NOT_IN_VISUAL_SPRITE` em `warnings` e `invalidRefs`;
- erros de schema/invariante impedem o report.

## APIs

Runtime:

```js
import { buildSpriteAnimationReportV1 } from './engine/runtime/src/index.mjs';

const report = await buildSpriteAnimationReportV1('./engine/runtime/test/fixtures/sprite-animation-idle.scene.json');
```

CLI:

```bash
node ./engine/runtime/src/cli.mjs inspect-sprite-animation ./engine/runtime/test/fixtures/sprite-animation-idle.scene.json --json
```

MCP:

```json
{
  "name": "inspect_sprite_animation",
  "arguments": {
    "path": "./engine/runtime/test/fixtures/sprite-animation-idle.scene.json"
  }
}
```

## Fora de escopo

- animation graph;
- timeline;
- skeletal animation;
- blending;
- atlas pipeline;
- editor;
- runtime canonico de animacao;
- alteracao de `RenderSnapshot v1`;
- autoplay no browser/export.

## Validacao

Cobertura dedicada:

- `engine/runtime/test/sprite-animation-runtime.test.mjs`;
- `engine/runtime/test/cli-inspect-sprite-animation.test.mjs`;
- `engine/runtime/test/sprite-animation-cross-interface.integration.test.mjs`;
- `tools/mcp-server/test/mcp-server.test.mjs`.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

Sprite Animation v1 esta fechado como diagnostico declarativo. O proximo pacote recomendado e UI system/prefab system V2 conforme roadmap.
