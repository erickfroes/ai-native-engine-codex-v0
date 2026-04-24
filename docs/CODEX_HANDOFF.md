# Handoff para Codex

Este repositório já está **pronto para ser entregue ao Codex**.

## Objetivo do handoff

Dar ao Codex um ponto de partida que já tenha:

- contrato formal de cena;
- validador local executável;
- tool MCP funcional;
- fixtures válidas e inválidas;
- documentação curta e ordenada.

## O que conferir antes de abrir no Codex

Rode no terminal do projeto:

```bash
npm run smoke
```

Se esse comando passar, o repositório está pronto para o Codex assumir a próxima iteração.

## Sequência recomendada dentro do Codex

1. Abra a pasta do repositório.
2. Marque o projeto como confiável para que o Codex carregue `.codex/config.toml`.
3. Confira se o MCP `ai_engine_tools` apareceu.
4. Peça para o Codex ler `README.md`, `AGENTS.md` e este arquivo.
5. Mande o prompt inicial de `docs/CODEX_FIRST_PROMPT.md`.

## O que o Codex deve fazer primeiro

Ordem recomendada:

1. rodar `npm run smoke`;
2. validar `./scenes/tutorial.scene.json`;
3. usar as tools MCP `validate_scene`, `describe_scene`, `validate_prefab`, `validate_scene_assets`, `validate_save`, `validate_input`, `inspect_world`, `inspect_scene_hierarchy`, `validate_ui`, `validate_render`, `validate_network`, `diff_network_snapshots`, `validate_network_sequence`, `simulate_network_replication`, `simulate_first_loop`, `benchmark_first_loop`, `replay_first_loop`, `verify_replay_determinism`, `playback_replay_artifact`;
4. comparar CLI e MCP;
5. propor os próximos 3 commits pequenos;
6. executar só o primeiro commit.
7. validar o loop inicial com `npm run simulate:first-loop -- ./scenes/tutorial.scene.json 3`.

## Próxima entrega sugerida para o Codex (Fase 2)

A base da Fase 1 já cobre prefab, assets, `describe_scene` e loop inicial.

Próxima continuação recomendada (Fase 2 — editor e rede):

- evoluir inspector/hierarchy serializável já disponível (`inspect_world` + `inspect_scene_hierarchy`, com filtros por `componentKind` e `systemName`) com views especializadas de domínio/editor;
- expandir replicação básica cliente-servidor a partir do contrato de mensagem já validável (`validate_network`), da inspeção de delta (`diff_network_snapshots`), da validação de sequência (`validate_network_sequence`) e da simulação de stream (`simulate_network_replication`);
- evoluir o replay já disponível (`replay_first_loop` + `verify_replay_determinism` + `playback_replay_artifact`) para capture/playback completo de ticks e múltiplos sistemas;
- expandir métricas de performance (frame/tick) para além do primeiro loop em formato consumível por automação;
- manter paridade CLI/MCP para todos os novos fluxos.

Checklist consolidado das fases: `docs/PHASE_CHECKLIST.md`.

## Observação importante

A configuração MCP deste projeto é local e repo-scoped. Se o projeto não estiver marcado como confiável, o Codex vai ignorar `.codex/config.toml` e o servidor MCP não será carregado.
