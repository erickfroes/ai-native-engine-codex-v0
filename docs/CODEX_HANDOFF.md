# Handoff para Codex - V0 Headless

Este repositorio esta pronto para handoff como V0 headless completa da Meta 1.

## O que o Codex recebe

- contratos v1 documentados;
- runtime, CLI e MCP alinhados nos fluxos headless principais;
- suites cross-interface para os contratos mais sensiveis;
- fixtures pequenas e reproduziveis;
- baseline de validacao claro antes de qualquer mudanca.

## O que conferir antes de editar

```bash
git status -sb
npm test
npm run validate:scenes
npm run smoke
```

## Sequencia recomendada dentro do Codex

1. Ler `README.md`, `AGENTS.md`, `docs/module-contracts.md` e este arquivo.
2. Confirmar baseline verde com `npm test`, `npm run validate:scenes` e `npm run smoke`.
3. Validar a cena tutorial por CLI e MCP.
4. Rodar `run-loop` e `run_loop` com `ticks` e `seed` fixos.
5. Exercitar o caminho opt-in com `--keyboard-script` ou `inputIntentPath`.
6. Exercitar `save-state` / `load-save`.
7. Exercitar `render-snapshot`, `render-svg` e `render-svg-demo`.
8. Propor mudancas pequenas a partir da Meta 2, sem mutar contratos v1 em place.

## Escopo entregue na Meta 1

- validacao de cena, save e input;
- loop headless interpretavel;
- replay e replay artifact;
- inspecao/simulacao de estado;
- persistencia minima;
- render textual deterministico.

## Fora de escopo que deve permanecer explicito

- canvas, Pixi, Three, WebGL e runtime visual real;
- editor;
- assets reais;
- captura real de teclado;
- multiplayer real;
- ECS completo.

## Regra pratica de continuidade

Se houver duvida sobre comportamento, preservar a V0 atual e adicionar teste/fixture antes de ampliar escopo.
