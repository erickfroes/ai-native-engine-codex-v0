# UI Input Step Lite v1

UI Input Step Lite v1 fecha um passo local minimalista de navega\u00e7\u00e3o/ativa\u00e7\u00e3o da UI sem alterar `ui.screen` nem o fluxo can\u00f4nico do loop.

Este report permanece como trilha compativel baseada em `InputIntent v1`. Para novos fluxos de UI, a superficie preferencial e `UiExplicitInput v1` + `UiExplicitInputStepReport v1`, documentada em `docs/UI_EXPLICIT_INPUT_LITE_V1.md` e `docs/UI_EXPLICIT_INPUT_STEP_LITE_V1.md`.

O objetivo deste slice \u00e9 pequeno:

- derivar um passo determin\u00edstico de UI a partir de `InputIntent v1` e `UiLocalScreenStateReport v1`/`UiActionSemanticsReport v1`;
- expor runtime, CLI e MCP alinhados;
- manter o resultado como `report-only`, sem consumo interativo no Browser Demo/export;
- preservar contratos existentes de UI e de fluxo (loop, replay, save/load, render).

Importante: este pacote n\u00e3o adiciona novos componentes de cena.

## Report

Runtime:

```js
buildUiInputStepReportV1(sceneOrPath, { inputIntent })
```

Shape:

```json
{
  "uiInputStepReportVersion": 1,
  "scene": "ui-action-semantics",
  "sourceUiSystemReportVersion": 1,
  "sourceUiNavigationFocusReportVersion": 1,
  "sourceUiActionSemanticsReportVersion": 1,
  "sourceUiLocalScreenStateReportVersion": 1,
  "scopePolicy": "topmost-active-screen",
  "inputIntentVersion": 1,
  "inputIntentTick": 1,
  "inputIntentEntityId": "player.hero",
  "attemptedMove": {
    "x": 1,
    "y": 0
  },
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
  "actionCandidates": [
    {
      "actionIndex": 0,
      "actionId": "menu.start-mission",
      "widgetId": "menu.start"
    },
    {
      "actionIndex": 1,
      "actionId": "menu.continue-mission",
      "widgetId": "menu.continue"
    }
  ],
  "activatedActionId": null,
  "warnings": []
}
```

Schema formal: `docs/schemas/ui-input-step-report-v1.schema.json`.

## Regras

- `attemptedMove` agrega todos os `move` actions do `InputIntent`.
- `direction` segue a conven\u00e7\u00e3o de eixos horizontais/verticais:
  - `-1` para esquerda/cima;
  - `0` para n\u00e3o mover;
  - `1` para direita/baixo.
- `stepType` pode ser:
  - `focus`: houve movimento lateral dentro da lista de `actionCandidates`;
  - `focus-move`: houve mudan\u00e7a de candidato por movimento em eixo;
  - `activate`: movimento zero com foco ativo em a\u00e7\u00e3o resolvida;
  - `noop`: sem a\u00e7\u00f5es de UI dispon\u00edveis no escopo focal.
- `inputHandled` reflete se houve foco/ativa\u00e7\u00e3o local aplic\u00e1vel.
- `actionCandidates` preserva a lista de a\u00e7\u00f5es resolvidas da tela focal, com `actionIndex`, `actionId` e `widgetId`.
- warnings esperadas:
  - `NO_ACTIONS_AVAILABLE`
  - `UI_ACTION_FOCUS_BOUNDARY`
  - `ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS`
  - `FOCUSED_ACTION_NOT_RESOLVED`
  - `NO_ACTION_FOCUS_FOR_ACTIVATION`
  - warnings herdadas de `UiLocalScreenStateReport v1` e `UiActionSemanticsReport v1`.

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-ui-input-step ./scenes/ui-action-semantics.scene.json --input-intent ./fixtures/input/move-player-right.intent.json --json
```

Sem `--json`, o CLI imprime resumo leg\u00edvel com pol\u00edtica de escopo, dire\u00e7\u00e3o, tipo de passo e warning.

Argumentos:

- `--input-intent <path>`: caminho para `InputIntent v1` JSON (obrigat\u00f3rio).
- `--json`: imprime o `UiInputStepReport v1` completo em JSON.

## MCP

Tool: `inspect_ui_input_step`

Input:

```json
{
  "path": "./scenes/ui-action-semantics.scene.json",
  "inputIntentPath": "./fixtures/input/move-player-right.intent.json"
}
```

Output: o mesmo shape do `UiInputStepReport v1` em `structuredContent`.

## Compatibilidade

- `UiSystemReport v1`, `UiNavigationFocusReport v1` e `UiActionSemanticsReport v1` permanecem inalterados e sem efeito colateral.
- `RenderSnapshot v1`, loop, replay e save/load permanecem inalterados.
- `Browser Demo`/`HTML Export` continuam passivos para este step (sem ativar UI interativa).
- Scene validation continua obrigat\u00f3ria antes de produzir qualquer report.

## Fixtures

- `scenes/ui-action-semantics.scene.json`: cena com `ui.action.semantics` para focus/activate determin\u00edsticos.
- `scenes/ui-production-screens.scene.json`: cena sem `ui.action.semantics` no foco atual (sem a\u00e7\u00f5es).
- `scenes/tutorial.scene.json`: cena sem `ui.screen`.
- `fixtures/input/move-player-left.intent.json`: move negativo em eixo X para cenarios de `navigate previous`.
- `fixtures/input/move-player-right.intent.json`: move positivo em eixo X.
- `fixtures/input/no-player-move.intent.json`: move zero para cen\u00e1rios de `activate`/`noop`.

## Fora de Escopo

- troca real de estado de UI no loop can\u00f4nico;
- muta\u00e7\u00e3o de `ui.screen` e persist\u00eancia de foco;
- mouse/touch/tap/hit-testing;
- controle de `Enter`/`Space` no runtime;
- preview interativo no Browser Demo/export neste pacote.

## Valida\u00e7\u00e3o

Cobertura dedicada:

- `engine/runtime/test/ui-input-step-v1.test.mjs`;
- `engine/runtime/test/ui-input-step-runtime.test.mjs`;
- `engine/runtime/test/cli-inspect-ui-input-step.test.mjs`;
- `engine/runtime/test/ui-input-step-cross-interface.integration.test.mjs`;
- `tools/mcp-server/test/ui-input-step.test.mjs`.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

`UI Input Step Lite v1` fica preservado como report-only compativel baseado em `InputIntent v1`. `UI Explicit Input Lite v1`, `UI Explicit Input Step Lite v1` e `UI Regression Matrix v1` agora consolidam a trilha local de navegacao/ativacao sem mutar `InputIntent v1`; a matriz dedicada vive em `docs/UI_REGRESSION_MATRIX_V1.md`. O proximo passo seguro e `Browser UI Input Preview v1`, ainda restrito a Browser Demo.
