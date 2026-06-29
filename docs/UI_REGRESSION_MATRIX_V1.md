# UI Regression Matrix v1

UI Regression Matrix v1 consolida a cobertura minima de regressao para input UI local antes do consumo local opt-in na Browser Demo e preserva exports passivos.

O objetivo deste pacote e de hardening:

- provar a convivencia entre `UiInputStepReport v1` legado e `UiExplicitInputStepReport v1`;
- explicitar a paridade runtime/CLI/MCP nas superficies de input UI;
- registrar budgets compactos de report;
- confirmar que Browser Demo sem preview, Simple HTML Export v1 e Portable HTML Export v2 continuam passivos para input UI.

Este pacote nao adiciona componente de cena, estado persistido, handler de widget, hit-testing, click, mouse/touch nem navegacao interativa em exports.

## Escopo coberto

| Caso | Superficie principal | Evidencia |
| --- | --- | --- |
| `navigate next` | `UiInputStepReport v1` legado | `engine/runtime/test/ui-input-step-runtime.test.mjs`, `engine/runtime/test/ui-input-step-cross-interface.integration.test.mjs` |
| `navigate previous` | `UiInputStepReport v1` legado | `engine/runtime/test/ui-input-step-runtime.test.mjs`, `engine/runtime/test/ui-input-step-cross-interface.integration.test.mjs` |
| `activate` | `UiInputStepReport v1` legado | `engine/runtime/test/ui-input-step-runtime.test.mjs`, `engine/runtime/test/ui-input-step-cross-interface.integration.test.mjs` |
| `navigate next` | `UiExplicitInputStepReport v1` | `engine/runtime/test/ui-explicit-input-step-runtime.test.mjs`, `engine/runtime/test/ui-explicit-input-cross-interface.integration.test.mjs` |
| `navigate previous` | `UiExplicitInputStepReport v1` | `engine/runtime/test/ui-explicit-input-step-runtime.test.mjs`, `engine/runtime/test/ui-explicit-input-cross-interface.integration.test.mjs` |
| `activate` | `UiExplicitInputStepReport v1` | `engine/runtime/test/ui-explicit-input-step-runtime.test.mjs`, `engine/runtime/test/ui-explicit-input-cross-interface.integration.test.mjs` |
| input invalido | `UiExplicitInput v1` + steps | `engine/runtime/test/ui-explicit-input-v1.test.mjs`, `engine/runtime/test/ui-explicit-input-cross-interface.integration.test.mjs`, `engine/runtime/test/ui-input-step-runtime.test.mjs` |
| cena sem actions | legado + explicito | `engine/runtime/test/ui-input-step-runtime.test.mjs`, `engine/runtime/test/ui-explicit-input-step-runtime.test.mjs`, suites cross-interface correspondentes |
| cena sem UI | legado + explicito | `engine/runtime/test/ui-input-step-runtime.test.mjs`, `engine/runtime/test/ui-explicit-input-step-runtime.test.mjs`, suites cross-interface correspondentes |
| cena invalida | legado + explicito | `engine/runtime/test/ui-input-step-cross-interface.integration.test.mjs`, `engine/runtime/test/ui-explicit-input-cross-interface.integration.test.mjs` |

## Paridade runtime/CLI/MCP

Superficies cobertas:

- `validate-ui-explicit-input` / `validate_ui_explicit_input`
- `keyboard-to-ui-explicit-input` / `keyboard_to_ui_explicit_input`
- `inspect-ui-input-step` / `inspect_ui_input_step`
- `inspect-ui-explicit-input-step` / `inspect_ui_explicit_input_step`

Suites principais de paridade:

- `engine/runtime/test/ui-input-step-cross-interface.integration.test.mjs`
- `engine/runtime/test/ui-explicit-input-cross-interface.integration.test.mjs`
- `tools/mcp-server/test/ui-input-step.test.mjs`
- `tools/mcp-server/test/ui-explicit-input.test.mjs`

Regra operacional desta matriz:

- runtime, CLI e MCP devem continuar produzindo o mesmo shape para os reports;
- erros previsiveis de input/cena devem continuar alinhados nas tres interfaces;
- `UiExplicitInputStepReport v1` segue como superficie preferencial para novos fluxos de UI;
- `UiInputStepReport v1` permanece como trilha compativel baseada em `InputIntent v1`.

## Budget compacto

Budgets guardados por teste:

- `UiExplicitInputStepReport v1` deve permanecer `<= 2048` bytes serializados e nao alterar `RenderSnapshot v1`.
- `UiInputStepReport v1` deve permanecer `<= 2048` bytes serializados e nao alterar `RenderSnapshot v1`.
- o delta de `uiSystem` nos caminhos de `Simple HTML Export v1` e `Portable HTML Export v2` continua preso ao gate existente de `5 * 1024` bytes; a folga atual e pequena e deve ser tratada como hard gate.

Suites:

- `engine/runtime/test/ui-explicit-input-step-runtime.test.mjs`
- `engine/runtime/test/ui-input-step-runtime.test.mjs`

## Passividade de Browser Demo e exports

Guardrails atuais:

- Browser Demo com `uiSystem: true` continua gerando overlay DOM passivo sem embutir `UiInputStepReport v1`, `UiExplicitInputStepReport v1` ou `UiExplicitInput v1`.
- Browser Demo com `uiSystem: true` e `uiInputPreview: true` pode embutir `metadata.browserUiInputPreview` e consumir input UI localmente, coberto por `docs/BROWSER_UI_INPUT_PREVIEW_V1.md`.
- Simple HTML Export v1 com `--ui-system` continua sem consumo interativo de input UI.
- Portable HTML Export v2 com `--ui-system` continua sem consumo interativo de input UI.

Suites:

- `engine/runtime/test/browser-playable-demo-runtime.test.mjs`
- `engine/runtime/test/simple-html-export-v1.test.mjs`
- `engine/runtime/test/portable-html-export-v2.test.mjs`

Sinais que continuam fora do HTML deste slice:

- `uiInputStepReportVersion`
- `uiExplicitInputStepReportVersion`
- `uiExplicitInputVersion`
- `browserUiInputPreview` nos exports e no Browser Demo sem opt-in de preview

## Comandos de validacao

```bash
npm test
npm run validate:scenes
npm run smoke
node ./engine/runtime/src/cli.mjs validate-ui-explicit-input ./fixtures/ui-input/navigate-next.ui-explicit-input.json --json
node ./engine/runtime/src/cli.mjs inspect-ui-input-step ./scenes/ui-action-semantics.scene.json --input-intent ./fixtures/input/move-player-right.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-ui-explicit-input-step ./scenes/ui-action-semantics.scene.json --ui-explicit-input ./fixtures/ui-input/navigate-next.ui-explicit-input.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/ui-production-screens.scene.json --ui-system --json
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-regression-matrix-export.html --json
node ./engine/runtime/src/cli.mjs export-portable-html-game ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-regression-matrix-portable.html --json
```

## Fora de escopo

- consumo interativo em exports;
- preview ativo sem opt-in explicito no Browser Demo;
- `move == 0` promovido a semantica canonica de UI fora do report legado;
- savegame canonico de UI;
- click, mouse, touch e hit-testing;
- novo componente de cena para input ou estado;
- renderer novo, editor-lite, particle-lite, route solving ou 3D.

## Continuidade

Com esta matriz e `Browser UI Input Preview v1` fechados, o menor proximo passo seguro e `Browser UI Input Preview Hardening Matrix v1`: consolidar drift, budget e paridade do preview antes de qualquer expansao para exports, mouse/touch, click ou savegame.
