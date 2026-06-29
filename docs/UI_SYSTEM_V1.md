# UI System v1

UI System v1 abre o primeiro contrato formal de UI da engine sem transformar HUD Lite no runtime canonico de interface.

O objetivo deste pacote e manter um slice pequeno e AI-native para telas declarativas e telas pequenas de producao:

- componente `ui.screen` versionado no Scene Document;
- arvore de widgets serializavel dentro do proprio componente;
- `UiSystemReport v1` deterministico;
- runtime, CLI e MCP alinhados;
- compatibilidade com `entity.prefab` por path;
- fixture publica de menu/HUD/pause autoravel em `scenes/ui-production-screens.scene.json`;
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
  "scene": "ui-production-screens",
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
node ./engine/runtime/src/cli.mjs inspect-ui-system ./scenes/ui-production-screens.scene.json --json
```

Sem `--json`, o CLI imprime um resumo estavel por screen.

## MCP

Tool: `inspect_ui_system`

Input:

```json
{
  "path": "./scenes/ui-production-screens.scene.json"
}
```

Output: o mesmo shape do `UiSystemReport v1` em `structuredContent`.

## Browser Demo e Export

UI System v1 tambem pode ser consumido visualmente de forma opt-in:

- `render-browser-demo --ui-system`
- `render_browser_demo({ uiSystem: true })`
- `export-html-game --ui-system`
- `export_html_game({ uiSystem: true })`
- `export-portable-html-game --ui-system`
- `export_portable_html_game({ uiSystem: true })`

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

## Telas Pequenas De Producao

`UI Production Screens v1` usa o mesmo contrato `ui.screen` sem adicionar campos ou widgets novos.

A fixture separada `scenes/ui-action-semantics.scene.json` adiciona somente `ui.action.semantics` co-localizado a `ui.screen`, preservando este contrato base sem novos campos em `ui.screen`.

Fixture publica:

```bash
node ./engine/runtime/src/cli.mjs inspect-ui-system ./scenes/ui-production-screens.scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-production-browser-demo.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-production.html --json
node ./engine/runtime/src/cli.mjs export-portable-html-game ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-production-portable.html --json
```

Regras do slice:

- `hud.main` e `menu.main` ficam ativos para demonstrar HUD persistente e menu estatico;
- `pause.overlay` fica `active: false`, aparece no report e nao vira DOM visual ate um pacote de estado local explicitamente versionado;
- `RenderSnapshot v1` da fixture permanece com `drawCalls: []`, porque UI nao entra no render canonico;
- Browser Demo, Simple HTML Export e Portable HTML Export mantem `uiSystem` como opt-in e nao ativam HUD Lite, Playable Save/Load Lite ou Audio Lite implicitamente;
- o delta de HTML para `uiSystem` nesta fixture fica coberto por budget de teste pequeno.

## Compatibilidade

- `HUD Lite` continua local ao HTML da Browser Demo.
- `Playable Save/Load Lite` continua local ao HTML.
- `RenderSnapshot v1`, `run-loop`, `save/load` e reports de colisao permanecem inalterados.
- `render-browser-demo`, `export-html-game` e `export-portable-html-game` consomem UI System v1 somente com opt-in explicito.
- `entity.prefab` continua opcional; quando presente por path, `ui.screen` pode vir do prefab.
- `ui.action.semantics`, quando presente na mesma entidade, nao altera o shape de `ui.screen` nem o `UiSystemReport v1`.

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
- `engine/runtime/test/portable-html-export-v2.test.mjs` cobre `export_portable_html_game` com `uiSystem: true`.
- `UiNavigationFocusReport v1` agora vive em contrato derivado separado, com testes dedicados em `engine/runtime/test/ui-navigation-focus-*.mjs` e `tools/mcp-server/test/ui-navigation-focus.test.mjs`.
- `UiActionSemanticsReport v1` agora vive em contrato derivado separado, com testes dedicados em `engine/runtime/test/ui-action-semantics-*.mjs`, `engine/runtime/test/cli-inspect-ui-action-semantics.test.mjs` e `tools/mcp-server/test/ui-action-semantics.test.mjs`.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

UI System v1 esta fechado como contrato declarativo/report e agora possui uma fixture publica de telas pequenas de producao em `scenes/ui-production-screens.scene.json`. `UI Navigation/Focus Lite v1`, `UI Action Semantics Lite v1`, `UI Local Screen State Lite v1` e `UI Input Step Lite v1` tambem estao fechados como contratos derivados separados, sem consumo visual/interativo no Browser Demo/export. O proximo pacote seguro e separar input UI explicito (`navigate`/`activate`) de `InputIntent v1` antes de qualquer consumo interativo, sem transformar o overlay HTML no runtime canonico.
