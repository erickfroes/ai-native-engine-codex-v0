# Codex Handoff

Pagina de partida para humanos e Codex. A funcao deste arquivo e responder rapido: onde estamos, qual e o menor proximo passo seguro e como validar.

## TL;DR

- Versao atual: V1 Small 2D release-checkpointed.
- Politica atual: V1 apenas bugfix, hardening e compatibilidade.
- Meta em andamento: Meta 4 / V2 2D-2.5D indie production.
- Slice fechado: `Audio Event Bank Manifest v1`.
- Proximo pacote recomendado: abrir `Audio Browser Preview v1` para consumir `AudioEventBankReport v1` na Browser Demo com preview local, paridade de report e budget de HTML antes de tocar exports.
- Slice atual em andamento: nenhum; o foco volta para continuidade documental e para o menor proximo contrato V2.
- Nao iniciar playback real de asset, export portatil com audio inline, savegame canonico de UI, editor-lite, particle-lite, route solving, 3D ou pipeline pesado antes de fechar um preview local pequeno de audio na Browser Demo.

## Estado

- [x] Meta 1 / V0 Headless concluida.
- [x] Meta 2 / Visual-interativa minima concluida.
- [x] Meta 3 / V1 Small 2D release-checkpointed.
- [ ] Meta 4 / V2 indie em andamento.
- [ ] Meta 5+ aguardam V2 demonstrada.
- [x] Atlas Region Consumption v1 sprite-only opt-in fechado para Browser Demo e Portable HTML Export v2.
- [x] Atlas Region Binding Contract v1 fechado para sprites via `visual.sprite.fields.atlasBindingId`, sideband versionado/hash e tiles report-only.
- [x] UI Production Screens v1 fechado com `scenes/ui-production-screens.scene.json`, menu/HUD ativos, pause autoravel inativo, paridade Browser Demo/export e budgets de HTML.
- [x] UI Navigation/Focus Lite v1 fechado como `UiNavigationFocusReport v1` derivado de `UiSystemReport v1`, com runtime/CLI/MCP e sem consumo visual.
- [x] UI Action Semantics Lite v1 fechado como `UiActionSemanticsReport v1`, via `ui.action.semantics` co-localizado a `ui.screen`, formalizado em `schemas/component.schema.json`, com fixture publica em `scenes/ui-action-semantics.scene.json` e Browser Demo/export ainda passivos.
- [x] UI Local Screen State Lite v1 fechado como `UiLocalScreenStateReport v1`, derivado de `UiSystemReport v1`, `UiNavigationFocusReport v1` e `UiActionSemanticsReport v1`, sem novo componente de cena e sem consumo no Browser Demo/export.
- [x] UI Input Step Lite v1 fechado como `UiInputStepReport v1`, derivado de `InputIntent v1`, `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1`, com runtime/CLI/MCP alinhados e Browser Demo/export ainda passivos.
- [x] UI Explicit Input Lite v1 fechado como `UiExplicitInput v1` externo para `navigate`/`activate`, separado de `InputIntent v1`, com runtime/CLI/MCP e fixtures proprias.
- [x] UI Explicit Input Step Lite v1 fechado como `UiExplicitInputStepReport v1`, derivado de `UiExplicitInput v1`, `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1`, com runtime/CLI/MCP alinhados e Browser Demo/export ainda passivos.
- [x] UI Regression Matrix v1 fechada com doc dedicada, casos `next/previous/activate`, budget compacto e guardrails de passividade para Browser Demo/export.
- [x] Browser UI Input Preview v1 fechado como consumo local opt-in so na Browser Demo, com `--ui-system --ui-input-preview`, MCP `uiInputPreview`, budget de `3 * 1024` bytes e exports passivos.
- [x] Browser UI Input Preview Hardening Matrix v1 fechada com cross-interface dedicado para preview on/off, budget guardado, exports `ui-action-semantics` passivos em runtime/CLI/MCP e rejeicao explicita de `--ui-input-preview` fora de `render-browser-demo`.
- [x] Audio Event Bank Manifest v1 fechado como contrato externo report-only acima de `Audio Lite v1`, com `scenes/audio-game-feedback.scene.json`, manifesto publico, runtime/CLI/MCP e testes cross-interface.
- [x] Validacao final do slice: `npm test`, `npm run validate:scenes` e `npm run smoke`.

Inventario completo: `docs/STATUS.md`.
Checklist por meta: `ROADMAP.md`.
Detalhe por versao: `docs/ENGINE_VERSION_ROADMAP.md`.

## Proximo passo

### `Audio Browser Preview v1`

Objetivo: consumir `AudioEventBankReport v1` na Browser Demo como preview local pequeno de audio, com foco em menu/gameplay, paridade com o report e budget de HTML antes de qualquer ampliacao para exports.

Escopo minimo do pacote:

- [ ] consumir `AudioEventBankReport v1` sem mutar `AudioLiteReport v1`;
- [ ] cobrir preview local de `scene.start`, `ui.navigate`, `ui.activate`, `player.move`, `player.blocked` e `manual.preview`;
- [ ] preservar Browser Demo e exports como superficies previsiveis, sem `src` real, `fetch`, URL remota ou autoplay;
- [ ] guardar budget de HTML e paridade de metadata/report;
- [ ] registrar testes cross-interface e doc curta do preview local.

Fora do pacote:

- export interativo de UI;
- savegame canonico de UI;
- mixer completo, streaming de musica, audio espacial, playback real de asset ou backend pesado;
- tocar `RenderSnapshot v1`, replay ou savegame fora do necessario para compatibilidade;
- editor visual;
- renderer novo;
- glTF/3D;
- particle-lite.

Criterio de pronto: preview local/documentacao curtos publicados, paridade runtime/CLI/MCP preservada, budget HTML guardado, exports continuam passivos, `npm test`, `npm run validate:scenes` e `npm run smoke` passam.

## Como continuar

1. Conferir estado:

```bash
git status -sb
```

2. Ler somente o necessario, nesta ordem:

- `README.md`
- `docs/CODEX_HANDOFF.md`
- `SPEC.md`
- `docs/module-contracts.md`
- `schemas/`
- `AGENTS.md`
- `ROADMAP.md`
- `docs/BROWSER_UI_INPUT_PREVIEW_HARDENING_MATRIX_V1.md`
- `docs/AUDIO_LITE_V1.md`
- `docs/AUDIO_LITE_TEST_MATRIX.md`
- `docs/AUDIO_EVENT_BANK_MANIFEST_V1.md`
- `docs/AUDIO_EVENT_BANK_TEST_MATRIX_V1.md`
- doc especifica do contrato tocado

3. Para pacote medio/grande, usar subagentes antes de editar.

Subagentes recomendados para o proximo pacote:

- `explorer`
- `gameplay_worker`
- `qa_contract_auditor`
- `perf_auditor`
- `docs_handoff_auditor`

4. Implementar nesta ordem:

- contrato/schema;
- fixture;
- runtime;
- CLI;
- MCP;
- cross-interface;
- docs;
- hardening;
- handoff.

Subagentes para esta rodada:

- `explorer`: mapeamento de código/contratos e pontos de integração.
- `gameplay_worker`: implementação direta do slice de audio pequeno.
- `qa_contract_auditor`: schema, fixtures e paridade runtime/CLI/MCP.
- `perf_auditor`: checagem de custo e ausência de regressão nos caminhos atuais.
- `docs_handoff_auditor`: alinhamento de handoff/roadmap/STATUS.

5. Fechar com:

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Comandos uteis

```bash
npm test
npm run validate:scenes
npm run smoke
node ./engine/runtime/src/cli.mjs render-snapshot ./scenes/tutorial.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-atlas-material-manifest ./engine/runtime/test/fixtures/atlas-material/starter.atlas-material.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./engine/runtime/test/fixtures/atlas-material/atlas-sprite-consumption.scene.json --atlas-material-manifest ./engine/runtime/test/fixtures/atlas-material/starter.atlas-material.json --json
node ./engine/runtime/src/cli.mjs export-portable-html-game ./engine/runtime/test/fixtures/atlas-material/atlas-sprite-consumption.scene.json --atlas-material-manifest ./engine/runtime/test/fixtures/atlas-material/starter.atlas-material.json --out ./tmp/atlas-portable-export.html --json
node ./engine/runtime/src/cli.mjs inspect-ui-system ./scenes/ui-production-screens.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-ui-navigation-focus ./scenes/ui-production-screens.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-ui-action-semantics ./scenes/ui-action-semantics.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-ui-local-screen-state ./scenes/ui-action-semantics.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-ui-input-step ./scenes/ui-action-semantics.scene.json --input-intent ./fixtures/input/move-player-right.intent.json --json
node ./engine/runtime/src/cli.mjs validate-ui-explicit-input ./fixtures/ui-input/navigate-next.ui-explicit-input.json --json
node ./engine/runtime/src/cli.mjs inspect-ui-explicit-input-step ./scenes/ui-action-semantics.scene.json --ui-explicit-input ./fixtures/ui-input/navigate-next.ui-explicit-input.json --json
node ./engine/runtime/src/cli.mjs validate-scene ./scenes/audio-game-feedback.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-audio-event-bank ./scenes/audio-game-feedback.audio-event-bank.json --json
node ./engine/runtime/src/cli.mjs inspect-audio-lite ./engine/runtime/test/fixtures/audio-lite-sfx.scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./engine/runtime/test/fixtures/audio-lite-sfx.scene.json --audio-lite --out ./tmp/audio-lite-browser-demo.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./engine/runtime/test/fixtures/audio-lite-sfx.scene.json --audio-lite --out ./tmp/audio-lite-export.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/v1-small-2d.html --json
```

Use as tools MCP equivalentes quando estiver validando cenas, contratos ou reports do dominio.

## Mapa de docs

- `README.md`: visao geral e quickstart.
- `ROADMAP.md`: checklist executivo por meta.
- `docs/ENGINE_VERSION_ROADMAP.md`: progressao V0 -> V6.
- `docs/STATUS.md`: estado consolidado e historico curto.
- `docs/module-contracts.md`: contratos por modulo.
- `docs/ATLAS_MATERIAL_MANIFEST_V1.md`: contrato atlas/material e consumo sprite-only opt-in.
- `docs/UI_SYSTEM_V1.md`: contrato de screens/widgets declarativos.
- `docs/UI_NAVIGATION_FOCUS_LITE_V1.md`: contrato report-only de foco/navegacao derivados de UI System v1.
- `docs/UI_ACTION_SEMANTICS_LITE_V1.md`: contrato report-only de semantica autorada para `ui.action.semantics`.
- `docs/UI_LOCAL_SCREEN_STATE_LITE_V1.md`: contrato report-only de estado local minimo de telas.
- `docs/UI_INPUT_STEP_LITE_V1.md`: contrato report-only para passo local de entrada de UI.
- `docs/UI_EXPLICIT_INPUT_LITE_V1.md`: contrato de input UI explicito separado de `InputIntent v1`.
- `docs/UI_EXPLICIT_INPUT_STEP_LITE_V1.md`: contrato report-only para passo local com `UiExplicitInput v1`.
- `docs/UI_REGRESSION_MATRIX_V1.md`: matriz curta de regressao para input UI local e passividade de Browser Demo/export.
- `docs/BROWSER_UI_INPUT_PREVIEW_V1.md`: contrato do preview local opt-in de input UI na Browser Demo.
- `docs/BROWSER_UI_INPUT_PREVIEW_HARDENING_MATRIX_V1.md`: matriz de hardening do preview local de input UI.
- `docs/AUDIO_LITE_V1.md`: contrato diagnostico atual de audio.
- `docs/AUDIO_EVENT_BANK_MANIFEST_V1.md`: contrato report-only de bancos/eventos pequenos acima de `Audio Lite v1`.
- `docs/AUDIO_EVENT_BANK_TEST_MATRIX_V1.md`: matriz curta de runtime/CLI/MCP para o manifesto de bancos/eventos.
- `docs/V2_GAP_AUDIT.md`: lacunas V2.
- `docs/CODEX_SUBAGENT_STRATEGY.md`: estrategia de subagentes.

## Regras de continuidade

- Fazer a menor mudanca defensavel.
- Preservar contratos V1 por padrao.
- Nao reabrir V1 para feature grande.
- Nao duplicar formato de dados se schema/report resolver.
- GUI so depois de existir caminho CLI/MCP.
- Atualizar este arquivo ao concluir um slice validado.
- Se a continuidade mudar, atualizar tambem `ROADMAP.md`.

## Resposta padrao

Ao concluir uma tarefa, responder com:

- `Resumo`: o que mudou, foi validado ou ficou decidido.
- `Checklist`: contratos, testes, docs e pendencias.
