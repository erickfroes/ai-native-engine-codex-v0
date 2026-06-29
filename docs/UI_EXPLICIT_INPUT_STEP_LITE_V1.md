# UI Explicit Input Step Lite v1

UI Explicit Input Step Lite v1 cria uma superficie paralela ao `UiInputStepReport v1`, mas usando `UiExplicitInput v1` em vez de `InputIntent v1`.

O objetivo deste slice e pequeno:

- derivar um passo local de UI a partir de `UiExplicitInput v1`;
- reutilizar `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1`;
- expor runtime, CLI e MCP alinhados;
- manter tudo como report-only, sem consumo interativo no Browser Demo/export.

## Report

Runtime:

```js
buildUiExplicitInputStepReportV1(sceneOrPath, { uiExplicitInput })
```

Shape resumido:

```json
{
  "uiExplicitInputStepReportVersion": 1,
  "scene": "ui-action-semantics",
  "sourceUiSystemReportVersion": 1,
  "sourceUiNavigationFocusReportVersion": 1,
  "sourceUiActionSemanticsReportVersion": 1,
  "sourceUiLocalScreenStateReportVersion": 1,
  "scopePolicy": "topmost-active-screen",
  "uiExplicitInputVersion": 1,
  "uiExplicitInputTick": 1,
  "actionType": "navigate",
  "direction": 1,
  "focusedScreenId": "menu.main",
  "focusedEntityId": "ui.menu",
  "stepType": "focus-move",
  "inputHandled": true,
  "focusedActionIndexBefore": 0,
  "focusedActionIdBefore": "menu.start-mission",
  "focusedWidgetIdBefore": "menu.start",
  "focusedActionIndexAfter": 1,
  "focusedActionIdAfter": "menu.continue-mission",
  "focusedWidgetIdAfter": "menu.continue",
  "actionCandidates": [],
  "activatedActionId": null,
  "warnings": []
}
```

Schema formal: `docs/schemas/ui-explicit-input-step-report-v1.schema.json`.

## Regras

- `navigate next` produz `direction: 1`.
- `navigate previous` produz `direction: -1`.
- `activate` produz `direction: 0`.
- `stepType` continua usando `focus`, `focus-move`, `activate` e `noop`.
- foco, candidatos e warnings usam a mesma logica pura do `UiInputStepReport v1` para preservar compatibilidade sem duplicar comportamento.
- o report nao inclui `inputIntentEntityId` nem `attemptedMove`.

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-ui-explicit-input-step ./scenes/ui-action-semantics.scene.json --ui-explicit-input ./fixtures/ui-input/navigate-next.ui-explicit-input.json --json
```

## MCP

Tool: `inspect_ui_explicit_input_step`

Input:

```json
{
  "path": "./scenes/ui-action-semantics.scene.json",
  "uiExplicitInputPath": "./fixtures/ui-input/navigate-next.ui-explicit-input.json"
}
```

Output: o mesmo shape do `UiExplicitInputStepReport v1` em `structuredContent`.

## Compatibilidade

- `UiInputStepReport v1` permanece como superficie compativel baseada em `InputIntent v1`.
- `UiExplicitInputStepReport v1` e a superficie preferencial para novos passos locais de UI.
- Browser Demo/export, loop, replay, save/load e `RenderSnapshot v1` permanecem inalterados.

## Validacao

Cobertura dedicada:

- `engine/runtime/test/ui-explicit-input-v1.test.mjs`;
- `engine/runtime/test/ui-explicit-input-step-v1.test.mjs`;
- `engine/runtime/test/ui-explicit-input-step-runtime.test.mjs`;
- `engine/runtime/test/cli-validate-ui-explicit-input.test.mjs`;
- `engine/runtime/test/cli-inspect-ui-explicit-input-step.test.mjs`;
- `engine/runtime/test/ui-explicit-input-cross-interface.integration.test.mjs`;
- `tools/mcp-server/test/ui-explicit-input.test.mjs`.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

`UI Regression Matrix v1` ja consolida `UiExplicitInput v1`, `UiExplicitInputStepReport v1`, convivencia com `UiInputStepReport v1` legado e a garantia de que Browser Demo/export continuam passivos. A matriz dedicada vive em `docs/UI_REGRESSION_MATRIX_V1.md`; o proximo passo seguro e `Browser UI Input Preview v1`, ainda restrito a Browser Demo.
