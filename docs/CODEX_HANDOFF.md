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
node ./engine/runtime/src/cli.mjs emit-world-snapshot ./scenes/tutorial.scene.json --json
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
3. usar a tool MCP `validate_scene` na mesma cena;
4. usar a tool MCP `emit_world_snapshot` para a mesma cena;
5. usar a tool MCP `run_replay` com `ticks` e `seed` fixos;
6. comparar runtime/CLI/MCP para replay + `world.snapshot`;
7. propor os próximos 3 commits pequenos;
8. executar só o primeiro commit.

## Status curto do slice concluído

Slice de paridade mínima de `world.snapshot` concluído:

- runtime gera `world.snapshot` determinístico;
- CLI expõe `emit-world-snapshot`;
- MCP expõe `emit_world_snapshot` e `run_replay`.

## Próxima entrega sugerida para o Codex

A melhor continuação da V0 é:

- entregar replicação real-time mínima no runtime;
- expandir replay para multi-sistema;
- publicar métricas de tick para CI.

## Observação importante

A configuração MCP deste projeto é local e repo-scoped. Se o projeto não estiver marcado como confiável, o Codex vai ignorar `.codex/config.toml` e o servidor MCP não será carregado.
