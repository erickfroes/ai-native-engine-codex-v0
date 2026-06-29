# Browser UI Input Preview v1

Browser UI Input Preview v1 fecha o primeiro consumo local e opt-in de input de UI na Browser Playable Demo.

O objetivo e pequeno: permitir navegar e ativar actions de `ui.action.semantics` no HTML de demo, sem promover isso a runtime canonico, sem tocar exports e sem alterar `InputIntent v1`.

## Superficies

- Runtime: `createBrowserPlayableDemoMetadataV1(scene, snapshot, { uiSystem: true, browserUiInputPreview: true })`
- CLI: `render-browser-demo <scene> --ui-system --ui-input-preview`
- MCP: `render_browser_demo({ path, uiSystem: true, uiInputPreview: true })`

`uiInputPreview` exige `uiSystem`. Sem `uiSystem`, runtime, CLI e MCP falham de forma previsivel.

## Metadata Interna

O HTML da Browser Demo embute `metadata.browserUiInputPreview` apenas quando o opt-in esta ativo.

O sideband v1 inclui:

- `browserUiInputPreviewVersion: 1`
- source versions de `UiSystemReport v1`, `UiNavigationFocusReport v1`, `UiActionSemanticsReport v1`, `UiLocalScreenStateReport v1` e `UiExplicitInputStepReport v1`
- `scopePolicy: "topmost-active-screen"`
- foco inicial resolvido (`focusedScreenId`, `focusedEntityId`, `focusedActionIndex`, `focusedActionId`, `focusedWidgetId`)
- `actionCandidates[]`
- `warnings[]`
- `uiExplicitInputVersion: 1`

Esse sideband e interno ao HTML; nao muda `RenderSnapshot v1`, schemas de cena, loop, replay ou savegame.

## Comportamento Local

- O unico listener de teclado continua no `canvas`.
- O overlay `uiSystem` continua DOM passivo com `pointer-events: none`.
- `ArrowRight`, `ArrowDown`, `KeyD` e `KeyS` navegam para a proxima action.
- `ArrowLeft`, `ArrowUp`, `KeyA` e `KeyW` navegam para a action anterior.
- `Enter`, `NumpadEnter` e `Space` ativam a action focada.
- O status local vive em `#browser-ui-input-preview-status`.
- Widgets acionaveis recebem `data-ui-preview-action-id`; o foco local usa `data-ui-preview-focus="true"`; ativacao usa `data-ui-preview-activated="true"`.
- Quando nao ha actions, o preview atualiza o status para no-op e deixa o movimento local da Browser Demo continuar.

## Guardrails

- `render-browser-demo --ui-system` sem `--ui-input-preview` nao embute `browserUiInputPreview`, status DOM ou handler local do preview.
- `export-html-game --ui-system` e `export-portable-html-game --ui-system` continuam passivos e nao embutem o preview.
- `InputIntent v1`, `UiInputStepReport v1`, `UiExplicitInputStepReport v1`, loop, replay, savegame e `RenderSnapshot v1` permanecem inalterados.
- O delta de HTML do preview sobre `--ui-system` fica coberto por teste com teto de `3 * 1024` bytes.

## Validacao

Suites principais:

- `engine/runtime/test/browser-playable-demo-runtime.test.mjs`
- `engine/runtime/test/cli-render-browser-demo.test.mjs`
- `tools/mcp-server/test/mcp-server.test.mjs`
- `engine/runtime/test/simple-html-export-v1.test.mjs`
- `engine/runtime/test/portable-html-export-v2.test.mjs`

Comandos:

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/ui-action-semantics.scene.json --ui-system --ui-input-preview --out ./tmp/ui-input-preview-browser-demo.html --json
npm test
npm run validate:scenes
npm run smoke
```

## Fora De Escopo

- consumo interativo em `export-html-game` ou `export-portable-html-game`;
- click, mouse, touch e hit-testing;
- estado de UI persistido em savegame canonico;
- novo componente de cena para input ou estado;
- promover `move == 0` de `InputIntent v1` a ativacao canonica de UI;
- layout engine, widget system amplo, binding de dados ou editor visual.

## Continuidade

`Browser UI Input Preview Hardening Matrix v1` agora fecha drift, budget, paridade cross-interface e a rejeicao explicita de `--ui-input-preview` fora de `render-browser-demo`. A matriz dedicada vive em `docs/BROWSER_UI_INPUT_PREVIEW_HARDENING_MATRIX_V1.md`; o menor proximo passo seguro passa a ser `Audio v1 de jogo pequeno`.
