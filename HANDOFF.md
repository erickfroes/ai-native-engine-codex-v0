# HANDOFF técnico — continuação do projeto

## 1) Resumo executivo

Este repositório está em **V0 funcional** e já cobre praticamente toda a fundação de validação/inspeção orientada a contrato por CLI e MCP.

Status de fase (consolidado):
- Fase 0: concluída.
- Fase 1: concluída no escopo V0.
- Fase 2: em andamento (rede/replay/métricas parciais).
- Fase 3: não iniciada.

## 2) Arquitetura atual

### Núcleo
- Runtime em `engine/runtime/src` organizado por domínio (`scene`, `schema`, `network`, `systems`, `ecs`, etc.).
- Contratos formais em `schemas/*.schema.json`.
- Cenas/fixtures de exemplo em `scenes/`.

### Superfícies de execução
- **CLI** (`engine/runtime/src/cli.mjs`) expõe comandos de validação, inspeção, replay e rede.
- **MCP server** (`tools/mcp-server/src/index.mjs`) expõe tools equivalentes para agentes.

### Qualidade
- Testes unitários/integração runtime + MCP em:
  - `engine/runtime/test/*.test.mjs`
  - `tools/mcp-server/test/mcp-server.test.mjs`

## 3) Decisões técnicas já tomadas

1. **Contrato-first**: evoluções passam por schema/contrato + fixture + validação + CLI + MCP + docs.
2. **Determinismo como requisito**: first-loop e replay usados como base de confiabilidade para automação.
3. **Rede com contrato explícito de snapshot**: escopo atual privilegia `world.snapshot` com direção/reliability/tick/entidades explícitos.
4. **Validação offline para V0/Fase 2 inicial**: várias ferramentas de rede/render são de inspeção offline, não ainda loop real-time completo.

## 4) Pendências principais

1. Integração de replicação em runtime real-time (além do tooling de validação/simulação).
2. Replay/capture/playback multi-sistema com cobertura mais ampla.
3. Métricas de perf além do first-loop.
4. Caminho de migração/versionamento de save.
5. Observabilidade/profiling e regressão visual (Fase 3).

## 5) Riscos técnicos

1. **Drift de documentação**: alguns docs legados (roadmap/sprint/readme MCP local) não refletem completamente o estado atual.
2. **Drift de paridade CLI/MCP** com crescimento de comandos sem testes de contrato por capability.
3. **Falsa sensação de completude de rede**: contrato/inspeção estão fortes, mas runtime online ainda parcial.
4. **Escalabilidade de fixtures**: com aumento de cenários, manutenção manual de fixtures pode ficar onerosa.

## 6) Recomendação objetiva de próximo sprint (Sprint N+1)

### Objetivo
Fechar lacuna crítica de Fase 2: **replicação mínima em runtime real-time + replay multi-sistema mínimo**.

### Escopo proposto (pequeno e revisável)
1. Introduzir passo de replicação no loop (server-authoritative mínimo) usando contrato atual de snapshot.
2. Capturar estado de pelo menos 2 sistemas no replay (não só first-loop health decay).
3. Exportar métrica simples de tick (latência média/p95) para CI.
4. Adicionar testes de integração de ponta a ponta (runtime -> replay -> verificação).
5. Atualizar docs de estado e handoff para refletir o novo baseline.

### Critério de aceite do sprint
- `npm test` verde.
- `npm run validate:scenes` verde.
- Pelo menos 1 fluxo de replicação executável em tempo de execução (não apenas simulado offline).
- Replay multi-sistema reproduzível com verificação determinística.

## 7) Ordem recomendada para o próximo agente

1. Ler: `README.md` -> `docs/CODEX_HANDOFF.md` -> `SPEC.md` -> `docs/module-contracts.md` -> `docs/PHASE_CHECKLIST.md`.
2. Rodar baseline:
   - `npm run smoke`
   - `npm run validate:scenes`
3. Implementar **somente** o menor slice do sprint (um commit por objetivo).
4. Validar paridade CLI/MCP para qualquer capacidade nova.
5. Atualizar documentação curta ao final da iteração.
