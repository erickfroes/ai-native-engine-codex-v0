# Especificação técnica — engine AI-native para Codex

## 1. Objetivo

Projetar um game engine próprio que seja **idealizado para ser usado por IA** e que funcione muito bem com o Codex como parceiro principal de implementação, manutenção, refatoração, profiling e authoring.

O produto não é apenas um motor de jogo. O produto é uma **plataforma de desenvolvimento assistido por IA**.

## 2. Princípios do desenho

### 2.1 Modularidade radical
Cada módulo deve ter:

- responsabilidade única,
- poucas dependências,
- interfaces explícitas,
- exemplos mínimos,
- testes locais rápidos.

### 2.2 Contratos antes de comportamento implícito
Nada importante deve depender de “tribal knowledge”.

Tudo o que a IA precisar modificar com segurança deve ter contrato formal:

- cena,
- entidade,
- componente,
- prefab,
- asset,
- savegame,
- mensagem de rede,
- evento de editor.

### 2.3 CLI-first, GUI-second
Toda operação importante do editor deve existir também como:

- comando de terminal,
- API local,
- ferramenta MCP.

A GUI é uma conveniência humana. A automação precisa sobreviver sem ela.

### 2.4 Diferenças pequenas e reversíveis
Arquitetura, convenções e ferramentas devem favorecer:

- patches pequenos,
- testes localizados,
- snapshots,
- checkpoints Git,
- rollback barato.

### 2.5 Determinismo como requisito de produto
O engine precisa permitir que a IA responda a perguntas como:

- “essa mudança quebrou replay?”
- “essa serialização mudou?”
- “o frame time piorou?”
- “essa entidade replica igual no cliente e no servidor?”

Sem isso, a IA edita rápido, mas valida mal.

## 3. Escopo recomendado

### V1: vertical slice pragmático
Escolha um alvo pequeno e valioso:

**RPG online 2.5D / 3D leve**

Por quê:

- exige estado, UI, assets, save, rede e cenas,
- mas não obriga física avançada,
- nem iluminação pesada,
- nem animation graph de nível AAA,
- nem ferramentas visuais gigantes logo no início.

### Fora da V1
Não entrar cedo em:

- terrain streaming complexo,
- física rígida avançada,
- shader graph visual completo,
- cinematic tools,
- pipeline AAA de animação,
- ECS distribuído,
- editor visual gigante.

## 4. Stack recomendada

### Runtime do engine
**Rust**

Motivos:

- segurança de memória,
- boa ergonomia para tooling moderno,
- desempenho suficiente para o escopo,
- ótimo encaixe para módulos pequenos e previsíveis.

### Tooling, editor e MCP
**TypeScript**

Motivos:

- velocidade de iteração,
- ótimo para ferramentas, pipelines, servidores locais e editor UI,
- excelente para integrar CLIs, JSON, schemas e processos externos.

### Render
Backend moderno baseado em abstração tipo **wgpu** ou equivalente.

Objetivo:

- manter o renderer previsível,
- permitir benchmark simples,
- facilitar diagnóstico por passes,
- evitar acoplamento prematuro a uma API gráfica só.

### Dados
- JSON para authoring legível
- MessagePack/binário para runtime quando necessário
- JSON Schema para validação
- versionamento explícito de formatos

### Gameplay
**ECS** desde o início, mas sem metaprogramação obscura.

### Rede
Servidor autoritativo desde a base.

### UI
Declarativa, serializável, testável por árvore de widgets.

## 5. Macroarquitetura

```text
Usuário / Designer / Codex
        |
        v
+------------------------------+
| Control Plane para IA        |
| - AGENTS.md                  |
| - .codex/config.toml         |
| - subagentes                 |
| - skills                     |
| - MCP tools                  |
| - testes / validações        |
+------------------------------+
        |
        v
+------------------------------+
| Tooling e Editor             |
| - importação de assets       |
| - inspector                  |
| - hierarchy                  |
| - scene view                 |
| - prefab tools               |
| - benchmark / replay         |
+------------------------------+
        |
        v
+------------------------------+
| Runtime do Engine            |
| - core / math                |
| - ecs                        |
| - scene                      |
| - render                     |
| - input                      |
| - audio                      |
| - physics-lite               |
| - ui                         |
| - networking                 |
| - savegame                   |
+------------------------------+
```

## 6. Módulos do runtime

### 6.1 `engine/core`
Responsável por:

- game loop,
- scheduler,
- clock,
- identificadores,
- logging,
- configuração,
- inicialização de subsistemas.

Nunca colocar aqui:

- regras de gameplay,
- lógica de UI específica,
- importação de assets específica.

### 6.2 `engine/math`
Responsável por:

- vetores,
- matrizes,
- quaternions,
- bounding volumes,
- transform helpers.

Regras:

- sem dependências de render,
- determinismo em operações críticas,
- testes numéricos claros.

### 6.3 `engine/ecs`
Responsável por:

- entidades,
- componentes,
- queries,
- schedules,
- eventos internos,
- world snapshots.

Regras:

- componentes são dados,
- sistemas são comportamento,
- side effects externos passam por interfaces controladas.

### 6.4 `engine/scene`
Responsável por:

- carga de cenas,
- links com prefabs,
- hierarquia,
- streaming simples,
- referências a assets.

Regras:

- cena não conhece renderer concreto,
- cena não carrega comportamento oculto,
- formato tem schema e versionamento.

### 6.5 `engine/render`
Responsável por:

- device/context,
- materiais,
- malhas,
- texturas,
- frame graph simples,
- passes bem nomeados,
- captura de métricas por frame.

Regras:

- gameplay não toca diretamente em backend gráfico,
- cada mudança grande precisa rodar benchmark comparável.

### 6.6 `engine/input`
Responsável por:

- teclado,
- mouse,
- gamepad,
- input mapping,
- gravação/replay de input.

### 6.7 `engine/audio`
Responsável por:

- eventos de áudio,
- mixer,
- bancos de sons,
- música e SFX.

### 6.8 `engine/physics_lite`
Responsável por:

- colisão simples,
- volumes básicos,
- triggers,
- character movement básico.

### 6.9 `engine/ui`
Responsável por:

- árvore de widgets,
- layout,
- binding controlado,
- skin/theme,
- navegação,
- serialização.

### 6.10 `engine/networking`
Responsável por:

- mensagens versionadas,
- transporte,
- replicação,
- authority,
- prediction básica quando necessário,
- reconciliação mínima.

### 6.11 `engine/save`
Responsável por:

- snapshots,
- save/load,
- migração de versão,
- validação de compatibilidade.

## 7. Camada “AI-first”

## 7.1 `AGENTS.md`
É o contrato operacional principal do repositório para o Codex.

Deve dizer:

- como o repositório está organizado,
- como compilar,
- como testar,
- o que não pode ser quebrado,
- quais ferramentas MCP usar para quais tarefas,
- o que significa “feito”.

## 7.2 `.codex/config.toml`
Configuração por projeto.

Usar para:

- subagentes,
- limites de paralelismo,
- MCP servers,
- comportamento consistente por repositório.

## 7.3 Subagentes
Os subagentes não devem ser genéricos. Devem ser estreitos.

Conjunto inicial recomendado:

- `render_architect`
- `gameplay_worker`
- `perf_auditor`

Opcional depois:

- `content_author`
- `network_reviewer`
- `schema_guard`

## 7.4 Skills
As skills representam workflows repetíveis.

Conjunto inicial recomendado:

- `create-gameplay-system`
- `add-networked-entity`
- `import-asset-pack`

Depois adicionar:

- `author-ui-screen`
- `create-prefab-family`
- `optimize-frame`
- `migrate-save-schema`
- `debug-replay-desync`

## 7.5 MCP
O MCP é a peça que transforma o engine em plataforma de trabalho para IA.

O Codex não deveria precisar operar apenas mexendo em arquivos crus. Ele deve poder chamar ferramentas do domínio do engine.

## 8. Catálogo inicial de ferramentas MCP

### Núcleo
- `validate_scene(path)`
- `validate_prefab(path)`
- `validate_component_schema(path)`
- `list_entities(scene_path)`
- `inspect_entity(scene_path, entity_id)`

### Assets
- `import_asset_pack(source_dir, target_pack)`
- `rebuild_asset_index()`
- `diff_asset_manifest(old_path, new_path)`

### Render e perf
- `compile_shaders()`
- `capture_frame(scene_path, output_png)`
- `measure_frame(scene_path, sample_count)`
- `compare_frame_metrics(baseline_json, candidate_json)`

### Gameplay e testes
- `spawn_vertical_slice(seed)`
- `run_smoke_tests()`
- `run_replay_suite()`
- `compare_world_snapshots(a, b)`

### Rede
- `list_net_messages()`
- `validate_net_contracts()`
- `simulate_client_server_tick(scene_path, ticks)`

### Savegame
- `diff_save_format(old_save, new_save)`
- `validate_save_migrations()`

## 9. Contratos formais

## 9.1 Cenas
Toda cena deve ter:

- `version`
- `metadata`
- `systems`
- `entities`
- `assetRefs`

## 9.2 Componentes
Todo componente serializável deve ter:

- `kind`
- `version`
- `replicated`
- `fields`

## 9.3 Mensagens de rede
Toda mensagem deve ter:

- `opcode`
- `version`
- `reliability`
- `direction`
- `payload`

## 9.4 Savegame
Todo save precisa registrar:

- versão do formato,
- versão do conteúdo,
- checksum,
- seed quando aplicável,
- migrações necessárias.

## 10. Estrutura recomendada do repositório

```text
.
├── README.md
├── SPEC.md
├── ROADMAP.md
├── AGENTS.md
├── .codex/
│   ├── config.toml
│   └── agents/
│       ├── render_architect.toml
│       ├── gameplay_worker.toml
│       └── perf_auditor.toml
├── .agents/
│   ├── skills/
│   │   ├── create-gameplay-system/
│   │   ├── add-networked-entity/
│   │   └── import-asset-pack/
│   └── plugins/
│       └── marketplace.json
├── docs/
│   └── module-contracts.md
├── engine/
│   └── README.md
├── schemas/
│   ├── scene.schema.json
│   ├── component.schema.json
│   └── net_message.schema.json
├── tools/
│   └── mcp-server/
│       ├── README.md
│       ├── package.json
│       └── src/
│           └── index.ts
└── plugins/
    └── engine-codex-integration/
        ├── .codex-plugin/
        │   └── plugin.json
        └── skills/
            └── engine-bootstrap/
                └── SKILL.md
```

## 11. Regras de projeto para IA

1. Nenhum componente novo entra sem contrato serializável claro.
2. Nenhum sistema novo entra sem teste unitário ou smoke test.
3. Toda mudança em render precisa registrar benchmark antes/depois.
4. Toda mudança em schema exige estratégia de migração.
5. Toda mensagem de rede precisa declarar direção e versionamento.
6. Toda cena de exemplo precisa ser pequena, reproduzível e automática.
7. Toda API importante precisa existir em forma de arquivo + CLI + MCP quando fizer sentido.
8. Evitar macros, reflexão obscura e geração mágica quando isso piorar legibilidade para IA.

## 12. Fluxos esperados com Codex

### Exemplo 1 — nova mecânica
Prompt:

> Crie um sistema de combate corpo a corpo usando ECS, adicione componentes mínimos, gere um prefab de inimigo simples e crie smoke test.

Esperado:

- skill `create-gameplay-system`
- `gameplay_worker` faz implementação
- `schema_guard` seria opcional no futuro
- MCP valida prefab/cena/testes

### Exemplo 2 — nova entidade replicada
Prompt:

> Adicione uma entidade de projétil replicada em rede com authority no servidor e snapshot consistente.

Esperado:

- skill `add-networked-entity`
- revisão de contratos de rede
- replay e simulação cliente/servidor

### Exemplo 3 — regressão de performance
Prompt:

> Investigue por que a cena benchmark_forest piorou 18% no frame time e proponha a menor correção segura.

Esperado:

- `perf_auditor` mede
- `render_architect` localiza causa
- `gameplay_worker` aplica correção mínima se necessário

## 13. Estratégia de roadmap

### Fase 0 — fundação
Entregar:

- estrutura do repositório,
- AGENTS.md,
- schemas mínimos,
- config do Codex,
- skills iniciais,
- catálogo MCP,
- testes smoke vazios,
- benchmark harness vazio.

### Fase 1 — runtime jogável mínimo
Entregar:

- loop,
- ECS,
- cena,
- render básico,
- input,
- UI mínima,
- assets,
- save básico.

### Fase 2 — editor e rede
Entregar:

- inspector,
- hierarchy,
- prefab,
- replicação básica,
- replays,
- validações de schema,
- perf metrics.

### Fase 3 — maturidade AI-native
Entregar:

- mais skills,
- subagentes extras,
- toolchain MCP rica,
- migrações de save,
- testes de regressão visual,
- empacotamento plugin estável.

## 14. Riscos

### Risco 1 — engine grande demais cedo
Mitigação:

- vertical slice,
- backlog curto,
- métricas de conclusão claras.

### Risco 2 — IA produzindo código rápido, mas inconsistente
Mitigação:

- AGENTS.md forte,
- skills estreitas,
- contratos formais,
- testes automáticos.

### Risco 3 — muita dependência de GUI
Mitigação:

- CLI-first,
- MCP-first,
- serialização legível.

### Risco 4 — formatos quebrando compatibilidade
Mitigação:

- versionamento explícito,
- diff de schema,
- migrações obrigatórias.

## 15. Decisão final recomendada

Para iniciar de forma realista:

- **Rust** no runtime
- **TypeScript** no editor, tooling e MCP
- **ECS** como espinha dorsal
- **JSON Schema** para contratos
- **servidor autoritativo**
- **skills + subagentes + MCP** como camada operacional do Codex

Esse é o desenho que melhor maximiza produtividade de IA sem virar um projeto impossível na primeira iteração.
