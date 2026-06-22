# Roadmap

Este roadmap organiza a evolucao do projeto como uma engine **AI-native**, desenvolvida com Codex, subagentes, contratos formais, CLI/MCP e validacao automatica.

A estrategia nao e saltar direto para AAA 3D. A sequencia correta e:

1. consolidar jogos pequenos 2D;
2. evoluir para jogos 2D/2.5D indie;
3. introduzir 3D indie;
4. amadurecer runtime/editor AA;
5. so entao perseguir objetivos AAA.

Detalhamento de versoes: `docs/ENGINE_VERSION_ROADMAP.md`.
Estrategia Codex/subagentes: `docs/CODEX_SUBAGENT_STRATEGY.md`.
Handoff operacional: `docs/CODEX_HANDOFF.md`.

## Como ler este checklist

- `[x]` Meta ou subdivisao concluida. Quando uma subdivisao grande esta concluida, ela fica compacta para nao duplicar docs historicos.
- `[ ]` Trabalho ainda necessario antes de considerar a meta fechada.
- Cada item aberto deve seguir: contrato/schema -> fixture -> runtime -> CLI -> MCP -> cross-interface -> docs -> hardening.
- V1 permanece aberta apenas para bugfix, hardening e compatibilidade.

## Estado atual

- [x] Meta 1 / V0 Headless completa.
- [x] Meta 2 / Visual-interativa minima completa.
- [x] Meta 3 / V1 Small 2D release-checkpointed.
- [ ] Meta 4 / V2 2D/2.5D indie production em andamento.
- [ ] Meta 5 / V3 3D indie ainda nao iniciada.
- [ ] Meta 6 / V4 runtime/editor AA ainda nao iniciada.
- [ ] Meta 7 / V5-V6 AAA aspiracional ainda nao iniciada.

Proximo pacote recomendado: **Atlas/Material Manifest v1**.

---

## Meta 1 - V0 Headless completa

Status: concluida.

- [x] Runtime headless, validacao, input, replay, save/load, state inspection, RenderSnapshot inicial, CLI/MCP e suites cross-interface.

Sem pendencias de produto nesta meta. Novas mudancas aqui devem ser bugfix/compatibilidade.

---

## Meta 2 - Visual/interativa minima

Status: concluida.

- [x] RenderSnapshot/SVG/Canvas/Browser Demo, Asset Manifest v1, componentes visuais 2D, image loading opcional, CLI/MCP e matriz visual.

Sem pendencias de produto nesta meta. Renderer real, editor, servidor, pipeline pesado e 3D continuam fora desta meta.

---

## Meta 3 - V1: jogos pequenos 2D completos

Status: release-checkpointed.

- [x] Colisao/gameplay 2D, movement blocking, tile collision, camera/viewport, HUD, save/load jogavel, HTML export, templates/guias, release checkpoint e matriz V1.
- [x] Slices pos-checkpoint que iniciam V2 sem reabrir V1: audio, UI, sprite animation, portable export, prefab, asset validation, visual regression, scene transition/composition e pathfinding grid.

Pendencias nesta meta:

- [ ] Nenhuma feature grande nova. Manter apenas bugfix, hardening e compatibilidade.
- [ ] Se for necessario endurecer validacao de cena, criar `validate-scene-strict` / `validate_scene_strict` como superficie opt-in, sem mutar `SceneValidationReport v1`.

---

## Meta 4 - V2: jogos 2D/2.5D de escopo indie

Objetivo: sair de demo e chegar a uma base de producao pequena para jogos 2D/2.5D com multiplas cenas, UI, audio, save/load, assets e export.

### Ja iniciado em slices pequenos

- [x] Prefab/templates baseline.
- [x] Scene Transition Report v1 e Scene Composition Manifest v1.
- [x] UI System v1 declarativo/report-only com consumo visual opt-in.
- [x] Audio Lite v1.
- [x] Sprite Animation v1 diagnostico e consumo visual opt-in inicial.
- [x] Portable HTML Export v2.
- [x] Visual Regression Baseline v1 estrutural.
- [x] Pathfinding Grid v1 report-only.

### Assets e materiais

- [ ] Atlas/Material Manifest v1 como proximo pacote.
- [ ] Schema e doc curta para atlas/material sem pipeline pesado obrigatorio.
- [ ] Fixture minima com sprite/tile/material refs.
- [ ] Runtime report/validator deterministico.
- [ ] CLI e MCP para validar/inspecionar manifesto.
- [ ] Cross-interface runtime/CLI/MCP.
- [ ] Integracao opt-in com render/export apenas depois do manifesto validar.
- [ ] Atualizar skill/import workflow se o manifesto mudar o fluxo de assets.

### UI de producao pequena

- [ ] Menus, HUD e mensagens usando `ui.screen`, sem acoplar ao HUD Lite.
- [ ] Navegacao/foco minimo e estados de tela serializaveis.
- [ ] Fixtures de menu, pause/game-over e HUD.
- [ ] Browser Demo/export com paridade CLI/MCP.
- [ ] Matriz de regressao UI.

### Animacao 2D

- [ ] Evoluir Sprite Animation para estados/seletores pequenos, preservando v1.
- [ ] Definir tile animation v1 ou declarar explicitamente como fora do V2 inicial.
- [ ] Garantir comportamento deterministico em Browser Demo/export.
- [ ] Cobrir cenas sem assetManifestPath e fallback visual.

### Audio de jogo

- [ ] Evoluir Audio Lite para audio v1 de jogo pequeno.
- [ ] Validar bancos/clips/eventos sem mixer completo obrigatorio.
- [ ] Cobrir menus, feedback de movimento e eventos de gameplay.
- [ ] Garantir export/browser sem dependencia externa surpresa.

### Particle-lite 2D

- [ ] Componente ou manifesto declarativo minimo.
- [ ] Report/validator runtime.
- [ ] Render/export opt-in.
- [ ] Budget de performance e testes deterministas.

### Navegacao e pathfinding

- [x] Pathfinding Grid v1 report-only.
- [ ] Pathfinding Query/Route Report v1 apenas se o jogo exemplo V2 precisar.
- [ ] Sem A*/BFS no loop canonico antes de report opt-in e fixtures.
- [ ] Sem runtime AI/path-following antes de rota report-only estar validada.

### Editor-lite e tooling automatizavel

- [ ] Definir editor-lite por contratos antes de GUI.
- [ ] Ferramentas CLI/MCP para listar cenas, entidades, componentes e assets.
- [ ] Inspector/hierarchy/asset browser como dados serializaveis.
- [ ] Operacoes de authoring com validacao e diff pequeno.
- [ ] GUI opcional depois de existir caminho CLI/MCP.

### Export/build indie pequeno

- [x] Simple HTML Export v1.
- [x] Portable HTML Export v2.
- [ ] Workflow multi-cena com assets, manifestos e checksums.
- [ ] Envelope de build/export versionado se o shape publico crescer.
- [ ] Artefatos reproduziveis e validacao automatica.

### Exemplo de jogo V2

- [ ] Escolher um pacote exemplo: platformer, top-down adventure ou RPG-lite.
- [ ] Multiplas cenas com manifesto/composicao.
- [ ] Menus, HUD, audio, save/load e assets reais pequenos.
- [ ] Pelo menos um fluxo completo de gameplay validado por CLI/MCP.
- [ ] Guia Codex-first para criar/adaptar esse tipo de jogo.

### Regressao e qualidade

- [ ] Matriz V2 cobrindo gameplay, visual, saves, export e manifests.
- [ ] Baselines visuais para cena V2 exemplo.
- [ ] Perf smoke/budget para render/export/particles quando existirem.
- [ ] Atualizar `docs/CODEX_HANDOFF.md` a cada slice fechado.

Criterio de saida da Meta 4:

- [ ] Um jogo 2D/2.5D pequeno com multiplas cenas, UI, audio, save/load e assets pode ser produzido sem refatorar a arquitetura.
- [ ] Codex consegue gerar cenas/prefabs/mecanicas usando skills e MCP.
- [ ] Regression matrix cobre gameplay, visual, saves, exports e manifests.

---

## Meta 5 - V3: 3D indie / 2.5D avancado

Objetivo: introduzir 3D de forma controlada, depois de V2 demonstrada.

Pre-requisitos:

- [ ] Meta 4 validada com jogo exemplo real.
- [ ] Atlas/Material Manifest v1 e asset pipeline repetivel estabilizados.
- [ ] Boundaries 2D/3D revisados por `engine_architect`, `render_architect` e `asset_pipeline_architect`.

### Contratos 3D

- [ ] Scene3D Document v1.
- [ ] `transform.3d` ou equivalente versionado.
- [ ] Camera 3D basica.
- [ ] Mesh/material refs serializaveis.
- [ ] Validacao e fixtures pequenas.

### Assets 3D

- [ ] glTF import minimo.
- [ ] Mesh/Material Manifest v1.
- [ ] Validacao de paths, materiais e dimensoes.
- [ ] CLI/MCP para importar/validar assets 3D.

### Render 3D inicial

- [ ] Backend 3D escolhido sem acoplar gameplay.
- [ ] Render snapshot/report 3D ou frame metrics iniciais.
- [ ] Lighting basico.
- [ ] Testes deterministas e perf budget inicial.

### Gameplay 3D minimo

- [ ] Movimento/camera simples.
- [ ] Collision 3D simples.
- [ ] Navigation graph/navmesh inicial apenas depois de contratos.
- [ ] Demo 3D pequena com mesh, material, camera e input.

Criterio de saida da Meta 5:

- [ ] Demo 3D pequena validada por runtime/CLI/MCP.
- [ ] Renderer 3D isolado de gameplay.
- [ ] Contratos 2D existentes preservados.

---

## Meta 6 - V4: runtime/editor AA

Objetivo: amadurecer a engine para equipe pequena e producao AA de escopo controlado.

Pre-requisitos:

- [ ] Meta 4 demonstrada com jogo 2D/2.5D.
- [ ] Meta 5 demonstrada com demo 3D indie, se o editor for cobrir 3D.
- [ ] Tooling CLI/MCP suficiente para o editor nao ser GUI-only.

### Editor visual modular

- [ ] Inspector.
- [ ] Hierarchy.
- [ ] Scene view.
- [ ] Asset browser.
- [ ] Comandos equivalentes via CLI/MCP para operacoes importantes.

### Ferramentas de conteudo

- [ ] Prefab tools.
- [ ] Terrain/tile/level tooling.
- [ ] Material editor.
- [ ] Animation graph inicial.
- [ ] Import/rebuild/diff de assets.

### Runtime de producao

- [ ] Profiler e telemetry local.
- [ ] Build pipeline multi-target.
- [ ] Plugin Codex do engine empacotado.
- [ ] QA automatizada por dominio.

### Workflow de equipe

- [ ] Subagentes por dominio com responsabilidades estaveis.
- [ ] Performance budgets por cena/demo.
- [ ] Regressao visual e savegame em CI.
- [ ] Documentacao operacional para equipe pequena.

Criterio de saida da Meta 6:

- [ ] Equipe pequena consegue produzir um jogo AA limitado usando editor, CLI/MCP e Codex.

---

## Meta 7 - V5/V6: caminho para engine 3D AAA

Status: aspiracional. Nao iniciar antes das metas anteriores demonstrarem projetos reais.

Pre-requisitos:

- [ ] Meta 6 validada em producao de equipe pequena.
- [ ] Pipeline/editor/QA/performance maduros.
- [ ] Netcode, assets e renderer com budgets e telemetria.

### Renderer e mundo grande

- [ ] Frame graph moderno.
- [ ] PBR completo.
- [ ] Sombras avancadas, GI/reflections conforme backend.
- [ ] Streaming de mundo, LOD e asset cache incremental.

### Gameplay, rede e simulacao

- [ ] Physics madura.
- [ ] Navmesh/pathfinding robusto.
- [ ] Multiplayer server-authoritative robusto.
- [ ] Prediction/reconciliation quando necessario.

### Pipeline profissional

- [ ] Editor multiusuario.
- [ ] Cinematic tools.
- [ ] Animation/skeletal system robusto.
- [ ] CI/CD, QA automatizado e performance budgets.
- [ ] Marketplace/plugin system.

Criterio realista:

- [ ] AAA so e meta valida depois que V1-V4 estiverem demonstradas com jogos reais, editor, pipeline, QA e performance.

---

## Proximo pacote recomendado

**Atlas/Material Manifest v1**

Checklist minimo do pacote:

- [ ] Ler `README.md`, `docs/CODEX_HANDOFF.md`, `SPEC.md`, `docs/module-contracts.md`, `schemas/`, `ROADMAP.md` e `docs/ENGINE_VERSION_ROADMAP.md`.
- [ ] Usar subagentes: `explorer`, `asset_pipeline_architect`, `render_architect`, `qa_contract_auditor`, `perf_auditor` e `docs_handoff_auditor`.
- [ ] Definir contrato/schema sem abrir pipeline pesado.
- [ ] Criar fixture minima de atlas/material.
- [ ] Implementar runtime report/validator.
- [ ] Expor CLI e MCP.
- [ ] Criar testes runtime/CLI/MCP/cross-interface.
- [ ] Atualizar docs e handoff.
- [ ] Rodar `npm test`, `npm run validate:scenes` e `npm run smoke`.

Fora do pacote inicial:

- [ ] Editor visual.
- [ ] Importador completo de atlas.
- [ ] Renderer novo.
- [ ] 3D/glTF.
- [ ] Material system completo.

---

## Regra de evolucao por pacote

Cada pacote funcional deve seguir, quando aplicavel:

1. contrato/schema;
2. fixtures;
3. runtime;
4. CLI;
5. MCP;
6. cross-interface;
7. docs;
8. hardening;
9. matriz/checklist da meta.

Commits recomendados: 3 a 6 por PR medio.

Merge somente com:

- `npm test` verde;
- `npm run validate:scenes` verde;
- `npm run smoke` verde;
- comportamento padrao preservado;
- docs curtas atualizadas;
- subagentes usados em tarefas complexas.
