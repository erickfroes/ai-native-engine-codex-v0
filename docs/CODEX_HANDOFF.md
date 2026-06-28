# Codex Handoff

Pagina de partida para humanos e Codex. A funcao deste arquivo e responder rapido: onde estamos, qual e o menor proximo passo seguro e como validar.

## TL;DR

- Versao atual: V1 Small 2D release-checkpointed.
- Politica atual: V1 apenas bugfix, hardening e compatibilidade.
- Meta em andamento: Meta 4 / V2 2D-2.5D indie production.
- Slice fechado: `UI Local Screen State Lite v1` report-only.
- Proximo pacote recomendado: `UI Input Step Lite v1`.
- Nao iniciar editor-lite, particle-lite, 3D, route solving ou pipeline pesado antes de avaliar um passo local de input para UI sem acoplar HUD Lite, Browser Demo/export, savegame ou render canonico.

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
- [x] Validacao final do slice: `npm test`, `npm run validate:scenes` e `npm run smoke` passaram.

Inventario completo: `docs/STATUS.md`.
Checklist por meta: `ROADMAP.md`.
Detalhe por versao: `docs/ENGINE_VERSION_ROADMAP.md`.

## Proximo passo

### `UI Input Step Lite v1`

Objetivo: avaliar um passo local minimo de navegacao/ativacao de UI a partir de `InputIntent v1`, `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1`, sem transformar Browser Demo/export no runtime canonico de interacao e sem salvar estado de UI em `savegame v1`.

Escopo do pacote:

- [ ] manter `UiLocalScreenStateReport v1` como estado local diagnostico/report-only, sem mutar `ui.screen` v1, `UiNavigationFocusReport v1` ou `UiActionSemanticsReport v1`;
- [ ] avaliar um passo local deterministico de input/foco/acao a partir de `InputIntent v1`, sem novo componente de cena;
- [ ] preservar HUD Lite, Playable Save/Load Lite, Audio Lite, UI Production Screens v1, UI Action Semantics Lite v1 e UI Local Screen State Lite v1 sem acoplamento;
- [ ] manter Browser Demo/export passivos neste pacote, salvo contrato visual separado;
- [ ] validar que `RenderSnapshot v1`, run-loop, replay e save/load nao mudam;
- [ ] docs curtas e atualizacao deste handoff/roadmap.

Fora do pacote:

- consumo interativo no Browser Demo/export;
- mouse/touch, hit-testing e click;
- estado de UI persistido em savegame canonico;
- novo componente de cena para input/estado de UI;
- layout engine completo;
- widget system amplo;
- binding de dados e HUD reativo;
- editor visual;
- renderer novo;
- glTF/3D;
- particle-lite.

Criterio de pronto: um passo local minimo de input/foco/acao fica explicito, versionado e inspecionavel por runtime/CLI/MCP; `UiSystemReport v1`, `UiNavigationFocusReport v1`, `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1` permanecem compativeis; `npm test`, `npm run validate:scenes` e `npm run smoke` passam.

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
- `docs/UI_SYSTEM_V1.md`
- `docs/UI_NAVIGATION_FOCUS_LITE_V1.md`
- `docs/UI_ACTION_SEMANTICS_LITE_V1.md`
- doc especifica do contrato tocado

3. Para pacote medio/grande, usar subagentes antes de editar.

Subagentes recomendados para o proximo pacote:

- `explorer`
- `engine_architect`
- `tooling_editor_architect`
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
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-production-browser-demo.html --json
node ./engine/runtime/src/cli.mjs export-portable-html-game ./scenes/ui-production-screens.scene.json --ui-system --out ./tmp/ui-production-portable.html --json
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
