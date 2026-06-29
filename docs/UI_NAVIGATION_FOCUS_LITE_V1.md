# UI Navigation/Focus Lite v1

UI Navigation/Focus Lite v1 abre a trilha de navegacao/foco de UI como diagnostico report-only, derivado de `UiSystemReport v1`.

O objetivo deste slice e pequeno:

- escolher um escopo de foco deterministico para `ui.screen`;
- listar candidatos de foco derivados da arvore de widgets ja normalizada;
- expor runtime, CLI e MCP alinhados;
- preservar `ui.screen` v1, `UiSystemReport v1`, Browser Demo/export, `RenderSnapshot v1`, loop, replay e save/load.

## Report

Runtime:

```js
buildUiNavigationFocusReportV1(sceneOrPath)
```

Shape:

```json
{
  "uiNavigationFocusReportVersion": 1,
  "scene": "ui-production-screens",
  "sourceUiSystemReportVersion": 1,
  "scopePolicy": "topmost-active-screen",
  "focusedScreenId": "menu.main",
  "focusedEntityId": "ui.menu",
  "initialFocusWidgetId": "menu.title",
  "screens": [],
  "candidates": [],
  "warnings": []
}
```

Schema formal: `docs/schemas/ui-navigation-focus-report-v1.schema.json`.

## Regras

- O report deriva de `UiSystemReport v1`; nao cria nem altera campos em `ui.screen`.
- A politica v1 usa uma unica scope: a topmost active screen pela ordem deterministica ja existente de UI System v1.
- `screens[]` lista todas as screens com `inFocusScope` e `candidateCount`.
- `candidates[]` lista apenas candidatos da scope ativa.
- Candidatos v1 sao widgets `label` folha, em ordem de pre-ordem do `UiSystemReport v1`.
- Navegacao v1 e sequencial report-only, com `previousCandidateWidgetId` e `nextCandidateWidgetId`.
- `UiActionSemanticsReport v1` agora vive em contrato separado; este report continua heuristico e pode divergir do `initialFocusWidgetId` autorado em `ui.action.semantics`.
- Se nao houver screen ativa, `focusedScreenId`, `focusedEntityId` e `initialFocusWidgetId` ficam `null`.

Warnings esperados:

- `NO_ACTIVE_SCREEN`: cena sem screen ativa.
- `NO_FOCUS_CANDIDATES`: scope ativa sem labels folha.
- `PARTIAL_WIDGET_GEOMETRY`: candidato sem `width` ou `height`.
- `DERIVED_CANDIDATES_HAVE_NO_ACTION_SEMANTICS`: candidatos derivados de labels sem acao declarada.

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-ui-navigation-focus ./scenes/ui-production-screens.scene.json --json
```

Sem `--json`, o CLI imprime resumo estavel de scope e candidatos.

## MCP

Tool: `inspect_ui_navigation_focus`

Input:

```json
{
  "path": "./scenes/ui-production-screens.scene.json"
}
```

Output: o mesmo shape do `UiNavigationFocusReport v1` em `structuredContent`.

## Compatibilidade

- `ui.screen` v1 permanece congelado.
- `UiSystemReport v1` permanece inalterado.
- `UiActionSemanticsReport v1` nao altera este report e deve ser consultado separadamente quando o consumidor precisar de semantica autorada.
- Browser Demo, Simple HTML Export e Portable HTML Export nao consomem foco neste slice.
- `RenderSnapshot v1` nao recebe drawCalls de UI.
- `run-loop`, replay, save/load, HUD Lite, Playable Save/Load Lite, Audio Lite e Movement Blocking permanecem inalterados.

## Budgets

Budgets v1:

- a fixture publica `scenes/ui-production-screens.scene.json` deve manter `candidates.length <= 64`;
- o JSON do report da fixture publica deve ficar abaixo de `4 KiB`;
- warnings da fixture publica devem ficar em no maximo `candidates.length + 1`, porque a estrategia atual pode emitir um warning de geometria por candidato e um warning agregado de semantica.

Menus maiores podem ser diagnosticados, mas devem motivar um contrato explicito de semantica/ordem antes de consumo visual interativo.

## Fora de Escopo

- componente `ui.navigation` explicito;
- ordem de foco autorada;
- consumir `ui.action.semantics` para reordenar candidatos v1;
- widgets interativos;
- ativacao por Enter/Espaco;
- navegacao por setas/WASD;
- estado de UI persistido;
- transicao de tela;
- binding de dados;
- editor visual;
- consumo visual no Browser Demo/export.

## Validacao

Cobertura dedicada:

- `engine/runtime/test/ui-navigation-focus-v1.test.mjs`;
- `engine/runtime/test/ui-navigation-focus-runtime.test.mjs`;
- `engine/runtime/test/cli-inspect-ui-navigation-focus.test.mjs`;
- `engine/runtime/test/ui-navigation-focus-cross-interface.integration.test.mjs`;
- `tools/mcp-server/test/ui-navigation-focus.test.mjs`.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

`UI Local Screen State Lite v1`, `UI Input Step Lite v1`, `UI Explicit Input Lite v1` e `UI Regression Matrix v1` ja fecham a trilha report-only de foco/estado/input local. A matriz consolidada vive em `docs/UI_REGRESSION_MATRIX_V1.md`; o proximo passo seguro e `Browser UI Input Preview v1`, ainda restrito a Browser Demo.
