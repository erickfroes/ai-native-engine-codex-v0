# STATUS — ai-native-engine-codex-v0

## 1) Estado atual do projeto

Projeto em **V0 funcional** com foco em operação por **CLI + MCP**, contratos formais por schema e validações determinísticas para automação.

Leitura consolidada dos docs indica:
- **Fase 0**: concluída.
- **Fase 1 (runtime jogável mínimo)**: concluída no escopo V0.
- **Fase 2 (editor + rede)**: em andamento parcial/sólido.
- **Fase 3 (maturidade AI-native)**: não iniciada.

## 2) O que já está implementado

### Runtime / Contratos
- Loader e validador de cena (schema + invariantes).
- Prefab: schema, validação e resolução no load.
- Assets: manifesto + validação cruzada com `assetRefs` da cena.
- Save/Input/UI/Render: schemas + validadores + relatórios.
- Rede:
  - validação de mensagem versionada (`net_message`),
  - contrato explícito para `world.snapshot`,
  - diff de snapshots,
  - validação de sequência,
  - simulação de stream de replicação.
- ECS:
  - inspeção de world,
  - hierarquia de cena determinística com filtros.
- Systems:
  - first-loop determinístico,
  - replay (geração/verificação),
  - capture/playback de artifact,
  - benchmark do loop inicial.

### Interfaces de operação
- CLI com comandos para todas as validações/inspeções centrais.
- MCP server local (`stdio`) com paridade funcional relevante com CLI.

### Qualidade
- Suíte de testes ampla em `engine/runtime/test` e `tools/mcp-server/test`.
- Fixtures válidas/inválidas cobrindo caminhos positivos e negativos.

## 3) O que ainda está faltando

1. **Replicação em runtime real-time** (hoje fluxo é fortemente validatório/offline para contrato e inspeção).
2. **Replay multi-sistema completo** (além do first-loop mínimo já entregue).
3. **Inspector/editor com views especializadas** (hoje há base serializável robusta).
4. **Métricas além do first-loop** (frame/tick mais abrangentes).
5. **Fase 3**:
   - migrações versionadas de save,
   - regressão visual,
   - observabilidade/profiling ampliados,
   - evolução de skills/subagentes,
   - plugin estável.

## 4) Comandos que funcionam (principais)

### Base
- `npm test`
- `npm run smoke`
- `npm run validate:scenes`

### Cena / Prefab / Assets
- `npm run validate:scene -- ./scenes/tutorial.scene.json`
- `npm run describe:scene -- ./scenes/tutorial.scene.json`
- `npm run validate:prefab -- ./engine/runtime/test/fixtures/prefabs/valid.hero.prefab.json`
- `npm run validate:scene:assets -- ./scenes/tutorial.scene.json ./scenes/assets.manifest.json`

### Save/Input/UI/Render
- `npm run validate:save -- ./scenes/tutorial.save.json`
- `npm run validate:input -- ./scenes/tutorial.input.json`
- `npm run validate:ui -- ./scenes/tutorial.ui.json`
- `npm run validate:render -- ./scenes/tutorial.render.json`

### Rede
- `npm run validate:network -- ./scenes/tutorial.netmsg.json`
- `npm run diff:network -- ./scenes/tutorial.netmsg.json ./scenes/tutorial.netmsg.tick43.json`
- `npm run validate:network:sequence -- ./scenes/tutorial.netmsg.json ./scenes/tutorial.netmsg.tick43.json`
- `npm run simulate:replication -- ./scenes/tutorial.netmsg.json ./scenes/tutorial.netmsg.tick43.json`

### Loop / Replay / Métricas
- `npm run simulate:first-loop -- ./scenes/tutorial.scene.json 3`
- `npm run replay:first-loop -- ./scenes/tutorial.scene.json 3`
- `npm run verify:replay -- ./scenes/tutorial.scene.json 3 3`
- `npm run capture:replay -- ./scenes/tutorial.scene.json ./scenes/tutorial.firstloop.replay.json 3`
- `npm run playback:replay -- ./scenes/tutorial.firstloop.replay.json`
- `npm run benchmark:first-loop -- ./scenes/tutorial.scene.json 3 5`

### MCP
- `npm run mcp:server`

## 5) Erros, gaps e riscos atuais

1. **Roadmap/sprint docs parcialmente desatualizados** (`ROADMAP.md`, `FIRST_SPRINT.md`, `tools/mcp-server/README.md`) frente ao estado atual do projeto.
2. **Dependência alta de contratos offline** para rede/replay; falta integração de runtime em tempo real para fechar parte da Fase 2.
3. **MCP e CLI amplos**: risco de drift futuro de paridade sem testes de contrato cross-surface ainda mais granulares.
4. **Sem regressão visual**: evolução de render/UI pode introduzir regressões sem sinalização automática.
5. **Versionamento/migração de save** ainda pendente para cenários de evolução longa.

## 6) Próximos 5 passos priorizados

1. **Fechar integração de replicação real-time mínima** no runtime (com contrato atual de `world.snapshot`).
2. **Expandir replay para multi-sistema** e manter verificação de determinismo end-to-end.
3. **Introduzir métricas de performance além do first-loop** (exportáveis para CI).
4. **Alinhar documentação legada** (`ROADMAP.md`, `FIRST_SPRINT.md`, `tools/mcp-server/README.md`) ao estado real de Fase 2.
5. **Criar base de migração versionada de save** (estrutura + primeiro teste de migração).
