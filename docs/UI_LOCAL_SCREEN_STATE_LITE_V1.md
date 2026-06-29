# UI Local Screen State Lite v1

UI Local Screen State Lite v1 explicita o estado local minimo de telas como um contrato novo, opt-in e report-only.

O objetivo deste slice e pequeno:

- derivar um estado local minimo de `ui.screen`, `UiNavigationFocusReport v1` e `UiActionSemanticsReport v1`;
- expor runtime, CLI e MCP alinhados;
- preservar `ui.screen` v1, `UiSystemReport v1`, `UiNavigationFocusReport v1` e `UiActionSemanticsReport v1` sem mutar seus shapes;
- manter Browser Demo/export, `RenderSnapshot v1`, loop, replay e save/load inalterados.

Importante: este slice nao adiciona componente novo de cena. O report e derivado dos contratos de UI ja existentes.

## Report

Runtime:

```js
buildUiLocalScreenStateReportV1(sceneOrPath)
```

Shape:

```json
{
  "uiLocalScreenStateReportVersion": 1,
  "scene": "ui-action-semantics",
  "sourceUiSystemReportVersion": 1,
  "sourceUiNavigationFocusReportVersion": 1,
  "sourceUiActionSemanticsReportVersion": 1,
  "scopePolicy": "topmost-active-screen",
  "focusResolutionPolicy": "action-semantics-then-navigation-focus",
  "focusedScreenId": "menu.main",
  "focusedEntityId": "ui.menu",
  "focusedWidgetId": "menu.start",
  "focusedActionId": "menu.start-mission",
  "heuristicFocusedWidgetId": "menu.title",
  "focusSource": "ui.action.semantics",
  "screens": [],
  "warnings": []
}
```

Schema formal: `docs/schemas/ui-local-screen-state-report-v1.schema.json`.

## Regras

- O report deriva de `UiSystemReport v1`, `UiNavigationFocusReport v1` e `UiActionSemanticsReport v1`.
- `scopePolicy` continua `topmost-active-screen`, preservando a mesma scope deterministica dos reports de UI anteriores.
- `focusResolutionPolicy` v1 resolve foco na ordem: `ui.action.semantics` e depois `UiNavigationFocusReport v1`.
- `focusedWidgetId` e `focusedActionId` so representam foco autorado quando `focusSource` e `ui.action.semantics`.
- `heuristicFocusedWidgetId` preserva o foco derivado de `UiNavigationFocusReport v1` mesmo quando a semantica autorada o substitui.
- `screens[]` preserva a ordem canonica de `UiSystemReport v1` e adiciona `localState`, `inActiveStack`, `stackIndex`, `candidateCount`, `actionCount` e foco resolvido por screen.
- `localState` v1 usa apenas tres estados:
  - `inactive`
  - `active-background`
  - `active-scope`
- cena sem `ui.screen` retorna `screens: []`, foco `null` e warning previsivel.

Warnings esperados:

- `NO_ACTIVE_SCREEN`
- `NO_FOCUSED_WIDGET`
- `FOCUSED_SCREEN_USES_HEURISTIC_FOCUS`
- `ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS`

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-ui-local-screen-state ./scenes/ui-action-semantics.scene.json --json
```

Sem `--json`, o CLI imprime um resumo estavel de foco, politica de resolucao e estado local por screen.

## MCP

Tool: `inspect_ui_local_screen_state`

Input:

```json
{
  "path": "./scenes/ui-action-semantics.scene.json"
}
```

Output: o mesmo shape do `UiLocalScreenStateReport v1` em `structuredContent`.

## Compatibilidade

- `ui.screen` v1 permanece congelado.
- `UiSystemReport v1`, `UiNavigationFocusReport v1` e `UiActionSemanticsReport v1` permanecem inalterados.
- Browser Demo, Simple HTML Export e Portable HTML Export permanecem passivos neste slice.
- `RenderSnapshot v1` nao recebe drawCalls de UI.
- `run-loop`, replay, save/load, HUD Lite, Playable Save/Load Lite, Audio Lite e Movement Blocking permanecem inalterados.
- `entity.prefab` continua opcional; quando presente por path, a resolucao acontece antes do report.

## Fixtures

As fixtures publicas existentes cobrem o slice:

- `scenes/ui-production-screens.scene.json`: fallback heuristico sem `ui.action.semantics` na screen focada;
- `scenes/ui-action-semantics.scene.json`: foco autorado por `ui.action.semantics` com divergencia explicita em relacao ao foco heuristico;
- `scenes/tutorial.scene.json`: cena sem UI, para estado vazio previsivel.

## Fora de Escopo

- componente novo de cena para estado local de UI;
- ativacao por Enter/Espaco;
- navegacao por setas/WASD;
- mouse, touch ou hit-testing;
- toggling de `active` em runtime;
- persistencia em `savegame v1` ou no local state do HTML;
- consumo interativo no Browser Demo/export;
- layout engine completo;
- widget system amplo;
- editor visual;
- renderer novo.

## Validacao

Cobertura dedicada:

- `engine/runtime/test/ui-local-screen-state-v1.test.mjs`;
- `engine/runtime/test/ui-local-screen-state-runtime.test.mjs`;
- `engine/runtime/test/cli-inspect-ui-local-screen-state.test.mjs`;
- `engine/runtime/test/ui-local-screen-state-cross-interface.integration.test.mjs`;
- `tools/mcp-server/test/ui-local-screen-state.test.mjs`.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

`UI Input Step Lite v1`, `UI Explicit Input Lite v1`, `UI Regression Matrix v1`, `Browser UI Input Preview v1` e `Browser UI Input Preview Hardening Matrix v1` agora fecham os passos locais minimos de navegacao/ativacao de UI. A matriz dedicada vive em `docs/BROWSER_UI_INPUT_PREVIEW_HARDENING_MATRIX_V1.md`; o proximo passo seguro passa a ser `Audio v1 de jogo pequeno`.
