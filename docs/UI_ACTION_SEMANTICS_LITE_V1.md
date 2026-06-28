# UI Action Semantics Lite v1

UI Action Semantics Lite v1 abre a primeira trilha autorada de acao/foco para UI pequena sem transformar a Browser Demo no runtime canonico de interface.

O objetivo deste slice e pequeno:

- declarar, por screen, quais widgets sao acionaveis;
- declarar um `initialFocusWidgetId` autorado para a scope ativa;
- expor runtime, CLI e MCP alinhados;
- preservar `ui.screen` v1, `UiSystemReport v1`, `UiNavigationFocusReport v1`, Browser Demo/export, `RenderSnapshot v1`, loop, replay e save/load.

## Componente

`ui.action.semantics` e opt-in, nao replicado e deve ficar na mesma entidade do `ui.screen` correspondente:

```json
{
  "kind": "ui.action.semantics",
  "version": 1,
  "replicated": false,
  "fields": {
    "screenId": "menu.main",
    "initialFocusWidgetId": "menu.start",
    "actions": [
      {
        "widgetId": "menu.start",
        "actionId": "menu.start-mission"
      },
      {
        "widgetId": "menu.continue",
        "actionId": "menu.continue-mission"
      }
    ]
  }
}
```

Campos:

- `screenId`: string nao vazia, obrigatoria e igual ao `screenId` do `ui.screen` co-localizado.
- `initialFocusWidgetId`: string opcional nao vazia; quando presente, deve referenciar um `widgetId` declarado em `actions`.
- `actions`: array nao vazio de bindings `{ widgetId, actionId }`.

Regras:

- `widgetId` e `actionId` devem ser unicos dentro do componente.
- cada `widgetId` deve apontar para um widget `label` folha da arvore declarada no `ui.screen` co-localizado.
- `ui.screen` pode existir sem `ui.action.semantics`; nesse caso o report emite warning explicito quando a screen focada nao possui semantica autorada.

## Report

Runtime:

```js
buildUiActionSemanticsReportV1(sceneOrPath)
```

Shape:

```json
{
  "uiActionSemanticsReportVersion": 1,
  "scene": "ui-action-semantics",
  "sourceUiSystemReportVersion": 1,
  "scopePolicy": "topmost-active-screen",
  "focusedScreenId": "menu.main",
  "focusedEntityId": "ui.menu",
  "initialFocusWidgetId": "menu.start",
  "screens": [],
  "actions": [],
  "warnings": []
}
```

Schema formal: `docs/schemas/ui-action-semantics-report-v1.schema.json`.

## Regras

- O report deriva de `UiSystemReport v1`, mas consome apenas `ui.action.semantics` da screen ativa do topo.
- `screens[]` lista todas as screens com `inActionScope`, `hasActionSemantics`, `bindingCount` e `actionCount`.
- `actions[]` lista apenas as acoes resolvidas da scope ativa, com `actionIndex`, `previousActionWidgetId` e `nextActionWidgetId`.
- `initialFocusWidgetId` reflete o valor autorado quando valido; caso contrario, usa a primeira acao resolvida como fallback.
- `UiNavigationFocusReport v1` permanece heuristico e pode divergir deste report; consumidores que precisem de semantica autorada devem usar `UiActionSemanticsReport v1`.

Warnings esperados:

- `NO_ACTIVE_SCREEN`: cena sem screen ativa.
- `NO_ACTION_SEMANTICS`: a screen focada nao possui `ui.action.semantics`.
- `NO_ACTIONABLE_WIDGETS`: a screen focada possui o componente, mas nenhuma acao valida foi resolvida.
- `ACTION_WIDGET_NOT_FOUND`, `ACTION_WIDGET_MUST_BE_LEAF_LABEL` e `INITIAL_FOCUS_WIDGET_NOT_ACTIONABLE` podem aparecer em objetos de cena em memoria que bypassarem o preflight/invariantes.

## CLI

```bash
node ./engine/runtime/src/cli.mjs inspect-ui-action-semantics ./scenes/ui-action-semantics.scene.json --json
```

Sem `--json`, o CLI imprime um resumo estavel de scope e acoes resolvidas.

## MCP

Tool: `inspect_ui_action_semantics`

Input:

```json
{
  "path": "./scenes/ui-action-semantics.scene.json"
}
```

Output: o mesmo shape do `UiActionSemanticsReport v1` em `structuredContent`.

## Compatibilidade

- `ui.screen` v1 permanece congelado.
- `UiSystemReport v1` permanece inalterado.
- `UiNavigationFocusReport v1` permanece report-only e nao passa a consumir `ui.action.semantics`.
- Browser Demo, Simple HTML Export e Portable HTML Export nao consomem este contrato neste slice.
- `RenderSnapshot v1` nao recebe drawCalls de UI.
- `run-loop`, replay, save/load, HUD Lite, Playable Save/Load Lite, Audio Lite e Movement Blocking permanecem inalterados.

## Budgets

Budgets v1:

- a fixture publica `scenes/ui-action-semantics.scene.json` deve manter `actions.length <= 16` na scope ativa;
- o JSON do report da fixture publica deve ficar abaixo de `4 KiB`;
- warnings da fixture publica devem ficar em no maximo `1`, porque a fixture valida deve produzir estado limpo.

## Fora de Escopo

- ativacao por Enter/Espaco;
- navegacao por setas/WASD;
- clique/mouse/touch;
- estado local de telas;
- savegame canonico de UI;
- widget system amplo;
- layout engine completo;
- editor visual;
- consumo visual no Browser Demo/export.

## Validacao

Cobertura dedicada:

- `engine/runtime/test/ui-action-semantics-v1.test.mjs`;
- `engine/runtime/test/ui-action-semantics-runtime.test.mjs`;
- `engine/runtime/test/cli-inspect-ui-action-semantics.test.mjs`;
- `engine/runtime/test/ui-action-semantics-cross-interface.integration.test.mjs`;
- `tools/mcp-server/test/ui-action-semantics.test.mjs`;
- `engine/runtime/test/scene-validation.test.mjs` e `engine/runtime/test/component-registry-v1.test.mjs` endurecem invariantes e registro do componente.

Rodar:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Continuidade

`UI Local Screen State Lite v1` agora fecha a explicacao do estado local minimo de telas sem mutar este report. O proximo passo seguro e `UI Input Step Lite v1`: avaliar um passo local de navegacao/ativacao de UI a partir de `InputIntent v1`, `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1`, ainda sem consumo no Browser Demo/export.
