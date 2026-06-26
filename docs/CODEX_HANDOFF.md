# Codex Handoff

Pagina de partida para humanos e Codex. A funcao deste arquivo e responder rapido: onde estamos, qual e o menor proximo passo seguro e como validar.

## TL;DR

- Versao atual: V1 Small 2D release-checkpointed.
- Politica atual: V1 apenas bugfix, hardening e compatibilidade.
- Meta em andamento: Meta 4 / V2 2D-2.5D indie production.
- Proximo pacote recomendado: `UI Navigation/Focus Lite v1`.
- Nao iniciar editor-lite, particle-lite, 3D, route solving ou pipeline pesado antes de fechar navegacao/foco minimo sobre `ui.screen` sem acoplar HUD Lite ou savegame.

## Estado

- [x] Meta 1 / V0 Headless concluida.
- [x] Meta 2 / Visual-interativa minima concluida.
- [x] Meta 3 / V1 Small 2D release-checkpointed.
- [ ] Meta 4 / V2 indie em andamento.
- [ ] Meta 5+ aguardam V2 demonstrada.
- [x] Atlas Region Consumption v1 sprite-only opt-in fechado para Browser Demo e Portable HTML Export v2.
- [x] Atlas Region Binding Contract v1 fechado para sprites via `visual.sprite.fields.atlasBindingId`, sideband versionado/hash e tiles report-only.
- [x] UI Production Screens v1 fechado com `scenes/ui-production-screens.scene.json`, menu/HUD ativos, pause autoravel inativo, paridade Browser Demo/export e budgets de HTML.
- [x] Validacao final do slice: `npm test` (715), `npm run validate:scenes` (6/6) e `npm run smoke` passaram.

Inventario completo: `docs/STATUS.md`.
Checklist por meta: `ROADMAP.md`.
Detalhe por versao: `docs/ENGINE_VERSION_ROADMAP.md`.

## Proximo passo

### `UI Navigation/Focus Lite v1`

Objetivo: adicionar foco/navegacao minima opt-in sobre `ui.screen`, sem transformar HUD Lite em UI canonica, sem salvar estado de UI em `savegame v1` e sem mutar `RenderSnapshot v1`, loop ou defaults de Browser Demo/export.

Escopo do pacote:

- [ ] decidir se foco/navegacao cabe como contrato pequeno novo ou se exige backlog separado;
- [ ] manter `ui.screen` v1 declarativo e congelado, salvo contrato novo explicitamente versionado;
- [ ] preservar HUD Lite, Playable Save/Load Lite, Audio Lite e UI Production Screens v1 sem acoplamento;
- [ ] garantir que Browser Demo/export continuem opt-in e que telas sem foco/navegacao mantenham HTML estavel;
- [ ] validar que `RenderSnapshot v1`, run-loop, replay e save/load nao mudam;
- [ ] docs curtas e atualizacao deste handoff/roadmap.

Fora do pacote:

- editor visual;
- layout engine completo;
- widget system amplo;
- binding de dados e HUD reativo;
- estado de UI persistido em savegame canonico;
- renderer novo;
- glTF/3D;
- particle-lite.

Criterio de pronto: foco/navegacao minima, se implementada, roda por Browser Demo/export como opt-in sem mutar contratos V1; UI System v1 continua declarativo; paridade aplicavel passa; `npm test`, `npm run validate:scenes` e `npm run smoke` passam.

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
