# Checklist de fases do projeto

Este documento traduz o roadmap do `SPEC.md` em checklist operacional.

Fonte de fases: seção **13. Estratégia de roadmap** do `SPEC.md`.

## Legenda

- [x] concluído
- [ ] pendente
- [~] parcial / em andamento

## Fase 0 — fundação

Objetivo no SPEC: estrutura inicial de repositório, contratos mínimos e base de automação.

- [x] estrutura do repositório
- [x] `AGENTS.md`
- [x] schemas mínimos
- [x] configuração Codex (`.codex/config.toml`)
- [x] skills iniciais
- [x] catálogo MCP
- [x] smoke test inicial (`npm run smoke`)
- [~] benchmark harness (não formalizado como suíte dedicada)

Status sugerido: **concluída**, com eventual refinamento de benchmark.

## Fase 1 — runtime jogável mínimo

Objetivo no SPEC: loop + ECS + cena + render básico + input + UI + assets + save.

- [x] loop determinístico mínimo (`simulate_first_loop`)
- [x] ECS com inspeção de world (`inspect_world`)
- [x] cena (schema + invariantes + loader)
- [x] render básico contratual (schema + `validate_render`)
- [x] input bindings (schema + `validate_input`)
- [x] UI mínima (schema + `validate_ui`)
- [x] assets (manifesto + validação cruzada)
- [x] save básico (schema + `validate_save`)
- [x] paridade CLI/MCP para os fluxos V0 principais

Status sugerido: **concluída no escopo V0**.

## Fase 2 — editor e rede

Objetivo no SPEC: inspector, hierarchy, prefab, replicação básica, replays, validações e métricas.

- [~] inspector (resumo ECS + hierarquia por `entity.id` + filtros por `componentKind` e `systemName` disponíveis; views especializadas de editor ainda pendentes)
- [x] hierarchy (árvore serializável determinística via `inspect_scene_hierarchy`)
- [x] prefab (schema + validação + resolução em load)
- [~] replicação básica cliente-servidor com payload versionado explícito (contrato validável + delta + validação de sequência + simulação de stream; integração de runtime em tempo real pendente)
- [~] replays (mínimo determinístico + verificação de determinismo + capture/playback de artifact entregues; cobertura multi-sistema pendente)
- [x] validações de schema (base estabelecida)
- [~] perf metrics de runtime (métricas do primeiro loop entregues; cobertura de outros sistemas pendente)

Status sugerido: **em andamento sólido** com inspector/hierarchy inicial, rede validável e métricas; replicação e replay capture/playback completo ainda pendentes.

### Backlog recomendado para iniciar a Fase 2

1. [x] Contrato de rede V1 mínimo (mensagens + snapshots + versão).
2. [x] Tooling CLI/MCP para inspeção de replicação e diff de snapshots.
3. [x] Replay mínimo determinístico (3-5 ticks) com fixture estável.
4. [x] Métricas de tick loop exportáveis em JSON para CI (`benchmark:first-loop`).
5. [x] cobertura de testes para caminhos válidos e inválidos das tools de rede.

## Fase 3 — maturidade AI-native

Objetivo no SPEC: expansão de skills/subagentes, toolchain rica, migrações de save, regressão visual e plugin estável.

- [ ] mais skills especializadas
- [ ] subagentes extras por domínio
- [ ] toolchain MCP mais rica (observabilidade + profiling)
- [ ] migrações de save versionadas
- [ ] testes de regressão visual
- [ ] empacotamento de plugin estável

Status sugerido: **não iniciada**.

## Critérios de saída por fase (resumo)

- Fase 0: smoke + contratos mínimos + MCP inicial.
- Fase 1: runtime V0 validável ponta a ponta (CLI/MCP) + testes verdes.
- Fase 2: rede + replay + métricas operacionais + inspeção de editor serializável.
- Fase 3: maturidade de automação/IA com regressão robusta e distribuição estável.
