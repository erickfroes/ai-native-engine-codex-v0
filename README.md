# AI-Native Engine para Codex — V0 executável

Este repositório agora contém uma **V0 funcional** de um engine AI-native pensado para o Codex operar em cima dele.

O que já está pronto:

- runtime mínimo orientado a dados;
- loader de cena JSON;
- validação por schema + invariantes do runtime (cenas);
- validação de prefab por schema;
- validação de referências de assets da cena contra manifesto;
- validação de savegame por schema;
- validação de input bindings por schema;
- validação de UI layout por schema;
- validação de render profile por schema;
- CLI para validar e descrever cenas;
- servidor MCP local via stdio com as tools `validate_scene`, `describe_scene`, `validate_prefab`, `validate_scene_assets`, `validate_save`, `validate_input`, `inspect_world`, `inspect_scene_hierarchy`, `validate_ui`, `validate_render`, `validate_network`, `diff_network_snapshots`, `validate_network_sequence`, `simulate_network_replication`, `simulate_first_loop`, `benchmark_first_loop`, `replay_first_loop`, `verify_replay_determinism`, `playback_replay_artifact`;
- primeiro system loop determinístico (decay de health por tick);
- inspeção ECS de world a partir da cena;
- testes automatizados do runtime e do MCP;
- cobertura de testes para caminhos válidos/inválidos dos fluxos de rede (`validate_network` e `diff_network_snapshots`);
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
npm run validate:prefab -- ./engine/runtime/test/fixtures/prefabs/valid.hero.prefab.json
npm run validate:scene:assets -- ./scenes/tutorial.scene.json ./scenes/assets.manifest.json
npm run validate:save -- ./scenes/tutorial.save.json
npm run validate:input -- ./scenes/tutorial.input.json
npm run inspect:world -- ./scenes/tutorial.scene.json
npm run inspect:hierarchy -- ./scenes/tutorial.scene.json
npm run inspect:world -- ./scenes/tutorial.scene.json --component-kind=health
npm run inspect:hierarchy -- ./scenes/tutorial.scene.json --system-name=networking.replication
npm run validate:ui -- ./scenes/tutorial.ui.json
npm run validate:render -- ./scenes/tutorial.render.json
npm run validate:network -- ./scenes/tutorial.netmsg.json
npm run diff:network -- ./scenes/tutorial.netmsg.json ./scenes/tutorial.netmsg.tick43.json
npm run validate:network:sequence -- ./scenes/tutorial.netmsg.json ./scenes/tutorial.netmsg.tick43.json
npm run simulate:replication -- ./scenes/tutorial.netmsg.json ./scenes/tutorial.netmsg.tick43.json
npm run simulate:first-loop -- ./scenes/tutorial.scene.json 3
npm run benchmark:first-loop -- ./scenes/tutorial.scene.json 3 5
npm run replay:first-loop -- ./scenes/tutorial.scene.json 3
npm run verify:replay -- ./scenes/tutorial.scene.json 3 3
npm run capture:replay -- ./scenes/tutorial.scene.json ./scenes/tutorial.firstloop.replay.json 3
npm run playback:replay -- ./scenes/tutorial.firstloop.replay.json
npm run validate:scenes
npm test
npm run smoke
npm run mcp:server
```

## O que a V0 valida

Além do schema JSON, o runtime também valida invariantes úteis para IA e automação:

- `entity.id` deve ser único;
- cada entidade precisa de pelo menos um componente local, exceto quando declara `prefab` válido;
- `component.kind` não pode repetir dentro da mesma entidade;
- se existir qualquer componente replicado, a cena precisa declarar o sistema `networking.replication`.

## Estado ideal para o Codex

Este repositório foi deixado no ponto em que o Codex já consegue:

1. ler contratos e docs do projeto;
2. rodar o validador localmente;
3. usar a tool MCP `validate_scene`;
4. propor o próximo slice de implementação com base em testes reais.


## Status por fase

O status consolidado por fase (Fase 0 a Fase 3), com checklist rastreável, está em:

- `docs/PHASE_CHECKLIST.md`

Resumo atual:

- Fase 0: concluída;
- Fase 1: concluída no escopo V0 (contratos + validações + CLI/MCP + loop inicial);
- Fase 2: iniciada com rede + replay mínimo + métricas de tick loop para automação;
- Fase 3: não iniciada.

## Próximo passo humano

Leia `docs/CODEX_HANDOFF.md`.
Ali já está o fluxo exato para abrir no Codex e começar a iterar sem perder contexto.
