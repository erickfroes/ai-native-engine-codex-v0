# Codex Handoff

Pagina de partida para humanos e Codex. A funcao deste arquivo e responder rapido: onde estamos, qual e o menor proximo passo seguro e como validar.

## TL;DR

- Versao atual: V1 Small 2D release-checkpointed.
- Politica atual: V1 apenas bugfix, hardening e compatibilidade.
- Meta em andamento: Meta 4 / V2 2D-2.5D indie production.
- Proximo pacote recomendado: `Atlas/Material Manifest v1`.
- Nao iniciar editor-lite, particle-lite, 3D, route solving ou pipeline pesado antes do manifesto atlas/material validar end-to-end.

## Estado

- [x] Meta 1 / V0 Headless concluida.
- [x] Meta 2 / Visual-interativa minima concluida.
- [x] Meta 3 / V1 Small 2D release-checkpointed.
- [ ] Meta 4 / V2 indie em andamento.
- [ ] Meta 5+ aguardam V2 demonstrada.

Inventario completo: `docs/STATUS.md`.
Checklist por meta: `ROADMAP.md`.
Detalhe por versao: `docs/ENGINE_VERSION_ROADMAP.md`.

## Proximo passo

### `Atlas/Material Manifest v1`

Objetivo: criar uma superficie declarativa/diagnostica minima para atlas e materiais 2D, sem abrir editor visual, renderer novo, 3D ou importador pesado.

Escopo do pacote:

- [ ] contrato/schema de atlas/material manifest;
- [ ] fixture minima com refs de sprite/tile/material;
- [ ] runtime report/validator deterministico;
- [ ] CLI e MCP para validar/inspecionar;
- [ ] testes runtime/CLI/MCP/cross-interface;
- [ ] docs curtas e atualizacao deste handoff/roadmap.

Fora do pacote:

- editor visual;
- material system completo;
- importador completo de atlas;
- renderer novo;
- glTF/3D;
- particle-lite.

Criterio de pronto: manifesto valida por runtime, CLI e MCP; fixture minima passa; comportamento atual continua compativel; `npm test`, `npm run validate:scenes` e `npm run smoke` passam.

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
- `asset_pipeline_architect`
- `render_architect`
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
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/v1-small-2d.html --json
```

Use as tools MCP equivalentes quando estiver validando cenas, contratos ou reports do dominio.

## Mapa de docs

- `README.md`: visao geral e quickstart.
- `ROADMAP.md`: checklist executivo por meta.
- `docs/ENGINE_VERSION_ROADMAP.md`: progressao V0 -> V6.
- `docs/STATUS.md`: estado consolidado e historico curto.
- `docs/module-contracts.md`: contratos por modulo.
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
