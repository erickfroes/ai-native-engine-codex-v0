# AI-Native Engine para Codex — V0 executável

Este repositório agora contém uma **V0 funcional** de um engine AI-native pensado para o Codex operar em cima dele.

O que já está pronto:

- runtime mínimo orientado a dados;
- loader de cena JSON;
- validação por schema + invariantes do runtime;
- CLI para validar e descrever cenas;
- servidor MCP local via stdio com a tool `validate_scene`;
- testes automatizados do runtime e do MCP;
- handoff pronto para uso com Codex.

## Estrutura prática

- `engine/runtime/` — runtime e CLI
- `scenes/` — cenas de exemplo e fixtures
- `schemas/` — contratos formais
- `tools/mcp-server/` — servidor MCP local
- `.codex/config.toml` — configuração do projeto para o Codex
- `docs/CODEX_HANDOFF.md` — como entregar isso ao Codex
- `docs/CODEX_FIRST_PROMPT.md` — prompt inicial já pronto

## Comandos principais

```bash
npm run validate:scene -- ./scenes/tutorial.scene.json
npm run describe:scene -- ./scenes/tutorial.scene.json
npm run validate:scenes
npm test
npm run smoke
npm run mcp:server
```

## O que a V0 valida

Além do schema JSON, o runtime também valida invariantes úteis para IA e automação:

- `entity.id` deve ser único;
- cada entidade precisa de pelo menos um componente;
- `component.kind` não pode repetir dentro da mesma entidade;
- se existir qualquer componente replicado, a cena precisa declarar o sistema `networking.replication`.

## Estado ideal para o Codex

Este repositório foi deixado no ponto em que o Codex já consegue:

1. ler contratos e docs do projeto;
2. rodar o validador localmente;
3. usar a tool MCP `validate_scene`;
4. propor o próximo slice de implementação com base em testes reais.

## Próximo passo humano

Leia `docs/CODEX_HANDOFF.md`.
Ali já está o fluxo exato para abrir no Codex e começar a iterar sem perder contexto.
