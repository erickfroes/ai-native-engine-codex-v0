# Codex Subagent Strategy

Este projeto deve ser desenvolvido com Codex como parceiro principal e subagentes como revisores/especialistas por dominio.

## Fontes oficiais de comportamento do Codex

- `AGENTS.md` define instrucoes duraveis do repositorio.
- `.codex/agents/` define agentes customizados por papel.
- `.agents/skills/` empacota workflows repetiveis.
- `.codex/config.toml` define modelo, subagents e MCP local.
- `tools/mcp-server/` expoe tools do engine para validacao/inspecao.

## Principio de orquestracao

Cada pacote medio deve usar pelo menos:

1. `explorer` ou agente equivalente para mapear arquivos e contratos;
2. agente de dominio para revisar design;
3. `gameplay_worker` ou worker equivalente para implementar;
4. `perf_auditor` ou `qa_contract_auditor` para revisar testes, determinismo e regressao.

## Papeis atuais

- `gameplay_worker`: implementacao de sistemas, integracoes e features de gameplay.
- `render_architect`: revisao de render, draw calls, contratos visuais e acoplamento.
- `perf_auditor`: performance, determinismo, replay e regressao de custo.

## Papeis recomendados adicionados

- `engine_architect`: boundaries de modulo, progressao V1-V6 e decisoes de arquitetura.
- `qa_contract_auditor`: schemas, fixtures, CLI/MCP, reports e cross-interface.
- `asset_pipeline_architect`: manifests, sprites, atlas, glTF, materials e imports.
- `tooling_editor_architect`: editor, inspector, scene tooling e workflows GUI/CLI.
- `netcode_architect`: replication, authority, snapshots, rollback e multiplayer.
- `docs_handoff_auditor`: README, STATUS, ROADMAP, handoff e checklists.

## Padrao de pacote com subagentes

Prompt deve declarar:

- branch sugerida;
- meta do pacote;
- subagentes e responsabilidades;
- commits esperados;
- restricoes rigidas;
- validacao final;
- criterio de merge.

## Tamanho de PR recomendado

- Hotfix: 1 commit.
- Pacote normal: 3 a 6 commits.
- Pacote grande: 7 a 10 commits, apenas se for coerente e testavel.

Nao usar um unico commit gigante para runtime + CLI + MCP + docs + hardening.

## Workflow local recomendado

1. Criar worktree/branch pelo Codex ou Git.
2. Rodar baseline:
   - `npm test`
   - `npm run validate:scenes`
   - `npm run smoke`
3. Rodar subagentes de mapeamento/design.
4. Implementar pacote.
5. Rodar testes focados.
6. Rodar validacao final.
7. Abrir PR.
8. Merge somente com permissao explicita.

## MCP como ferramenta de agentes

Sempre que existir tool MCP, preferir MCP para validacao e inspecao, em vez de inferir manualmente.

Exemplos:

- validar cena: `validate_scene`;
- inspecionar loop: `run_loop`, `plan_loop`;
- validar save: `validate_save`, `load_save`;
- renderizar: `render_snapshot`, `render_svg`, `render_browser_demo`;
- colisao: `inspect_collision_bounds`.

## Skills prioritarias por versao

### V1 small 2D

- `create-gameplay-system`
- `import-asset-pack`
- usar apenas workflows que preservem Scene Document v1, Browser Demo, templates e release checkpoint;
- nao usar skill de UI system, audio, animation, prefab, editor ou pathfinding nesta fase release-checkpointed.

### V2 indie 2D/2.5D

- `author-ui-screen`
- `create-prefab`
- `create-scene-transition`
- `create-animation-clip`
- `build-asset-atlas`

### V3 3D indie

- `import-gltf-model`
- `create-material`
- `author-3d-scene`
- `profile-render-frame`

### V4+ AA/AAA

- `build-editor-tool`
- `profile-frame-budget`
- `review-network-authority`
- `run-visual-regression`
- `audit-build-pipeline`

## Criterio de qualidade AI-native

Uma feature so esta bem integrada ao Codex quando:

- possui contrato ou doc curta;
- tem fixture minima;
- runtime e test coverage existem;
- CLI/MCP existem quando a feature precisa ser operavel por agentes;
- cross-interface existe para fluxos criticos;
- docs/handoff refletem a mudanca;
- subagentes revisaram riscos de dominio.
