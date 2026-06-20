# UI System v1

UI System v1 abre o primeiro contrato formal de UI da engine sem transformar HUD Lite no runtime canonico de interface.

O objetivo deste pacote e fechar um slice pequeno e AI-native:

- componente `ui.screen` versionado no Scene Document;
- arvore de widgets serializavel dentro do proprio componente;
- `UiSystemReport v1` deterministico;
- runtime, CLI e MCP alinhados;
- compatibilidade com `entity.prefab` por path;
- HUD Lite preservado como diagnostico local da Browser Demo.

## Componente

`ui.screen` e declarativo, opt-in e nao replicado:

```json
{
  "kind": "ui.screen",
  "version": 1,
  "replicated": false,
  "fields": {
    "screenId": "hud.main",
    "active": true,
    "layer": 100,
    "widgets": [
      {
        "id": "hud.root",
        "kind": "panel",
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 48,
        "children": [
          {
            "id": "score.label",
            "kind": "label",
            "text": "Score: 000",
            "x": 8,
            "y": 8
          }
        ]
      }
    ]
  }
}
```

Campos do screen:

- `screenId`: string nao vazia, obrigatoria e unica por cena.
- `active`: booleano opcional; default diagnostico `true`.
- `layer`: inteiro opcional; default diagnostico `0`.
- `widgets`: array nao vazio de widgets declarativos.

Widgets v1 suportados:

- `panel`
- `label`

Campos comuns de widget:

- `id`: string nao vazia e unica dentro do `ui.screen`.
- `kind`: `panel` ou `label`.
- `x` e `y`: inteiros opcionais; default diagnostico `0`.
- `width` e `height`: inteiros opcionais `>= 1`.
- `children`: array opcional de widgets filhos.

Campos especificos:

- `label` exige `text` como string nao vazia.
- `panel` nao aceita `text`.

## Report

Runtime:

```js
buildUiSystemReportV1(sceneOrPath)
```

Shape:

```json
{
  "uiSystemReportVersion": 1,
  "scene": "ui-screen-prefab-fixture",
  "screens": [
    {
      "screenId": "hud.main",
      "entityId": "ui.hud",
      "active": true,
      "layer": 100,
      "widgets": [],
      "widgetTree": []
    }
  ],
  "warnings": []
}
```

Regras:

- `screens` sao ordenadas por `layer`, depois `screenId`, depois `entityId`.
- `widgets` e a lista flat em pre-ordem, com `parentWidgetId` e `depth`.
- `widgetTree` preserva a ordem declarada dos widgets e filhos.
- caminhos de cena passam por `validateSceneFile`, entao `entity.prefab` por path ja chega resolvido ao report.
- objetos de cena em memoria passam por invariantes estruturais antes do report.
- cena sem `ui.screen` retorna `screens: []` e `warnings: []`.
- o report e diagnostico/declarativo: nao renderiza HTML, nao faz layout dinamico e nao substitui HUD Lite.

Schema formal do report: `docs/schemas/ui-system-report-v1.schema.json`.

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-ui-system ./engine/runtime/test/fixtures/ui-screen-prefab.scene.json --json
```

Sem `--json`, o CLI imprime um resumo estavel por screen.

## MCP

Tool: `inspect_ui_system`

Input:

```json
{
  "path": "./engine/runtime/test/fixtures/ui-screen-prefab.scene.json"
}
```

Output: o mesmo shape do `UiSystemReport v1` em `structuredContent`.

## Browser Demo e Export

UI System v1 tambem pode ser consumido visualmente de forma opt-in:

- `render-browser-demo --ui-system`
- `render_browser_demo({ uiSystem: true })`
- `export-html-game --ui-system`
- `export_html_game({ uiSystem: true })`

Esse consumo embute `metadata.uiSystem` derivado do `UiSystemReport v1` e renderiza um overlay DOM passivo em screen-space sobre o canvas.

Regras:

- o overlay renderiza apenas screens `active: true`;
- screens seguem a ordem deterministica do report: `layer`, depois `screenId`, depois `entityId`;
- widgets seguem `widgetTree`;
- `panel` vira bloco visual passivo;
- `label` vira texto passivo;
- `camera.viewport` nao desloca UI;
- sem `--ui-system` / `uiSystem: true`, Browser Demo e export nao embutem `metadata.uiSystem` nem overlay;
- HUD Lite continua separado e nao e substituido por `ui.screen`.

## Compatibilidade

- `HUD Lite` continua local ao HTML da Browser Demo.
- `Playable Save/Load Lite` continua local ao HTML.
- `RenderSnapshot v1`, `run-loop`, `save/load` e reports de colisao permanecem inalterados.
- `render-browser-demo` e `export-html-game` consomem UI System v1 somente com opt-in explicito.
- `entity.prefab` continua opcional; quando presente por path, `ui.screen` pode vir do prefab.

## Fora de escopo

- layout engine completo;
- binding de dados;
- navegacao por input;
- focus management;
- button, slider, list, dialog;
- renderer formal de UI;
- editor de UI;
- substituir HUD Lite atual;
- salvar estado de UI em savegame canonico.
- aplicar `camera.viewport` na UI.

## Validacao

Cobertura dedicada:

- `engine/runtime/test/ui-system-runtime.test.mjs`;
- `engine/runtime/test/cli-inspect-ui-system.test.mjs`;
- `engine/runtime/test/ui-system-cross-interface.integration.test.mjs`;
- `tools/mcp-server/test/ui-system.test.mjs`.
- consumo visual opt-in em `engine/runtime/test/browser-playable-demo-runtime.test.mjs`, `engine/runtime/test/cli-render-browser-demo.test.mjs`, `engine/runtime/test/browser-playable-demo-cross-interface.integration.test.mjs`, `engine/runtime/test/simple-html-export-v1.test.mjs` e `tools/mcp-server/test/mcp-server.test.mjs`.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

UI System v1 esta fechado como contrato declarativo/report e agora possui consumo visual opt-in incremental na Browser Demo/export. Proximos pacotes recomendados: consumo visual V2 para Sprite Animation v1 e expansao incremental do prefab system.
