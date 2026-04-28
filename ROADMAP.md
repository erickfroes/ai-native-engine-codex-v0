# Roadmap

Este roadmap organiza a evolucao do projeto como uma engine **AI-native**, projetada para ser desenvolvida com Codex, subagentes, contratos formais, CLI/MCP e validacao automatica.

A estrategia nao e tentar saltar direto para uma engine AAA 3D. A sequencia correta e progressiva:

1. consolidar jogos pequenos;
2. evoluir para jogos 2D/2.5D completos;
3. introduzir 3D indie;
4. amadurecer ferramentas/editor/pipeline;
5. chegar a uma base AA;
6. so entao atacar objetivos de engine 3D AAA.

Detalhamento completo: `docs/ENGINE_VERSION_ROADMAP.md`.
Estrategia Codex/subagentes: `docs/CODEX_SUBAGENT_STRATEGY.md`.

---

## Meta 1 - V0 Headless completa

Status: concluida.

Entregas consolidadas:

- validacao de scene document por schema + invariantes;
- runtime estavel com loop headless interpretavel;
- InputIntent v1 e KeyboardInputScript v1 opt-in;
- replay deterministico e replay artifact;
- save/load v1 minimo;
- inspect-state, simulate-state e State Mutation Trace v1;
- RenderSnapshot v1 inicial;
- Render SVG v1 inicial;
- CLI e MCP para os fluxos headless principais;
- suites cross-interface e smoke.

Fora de escopo assumido nesta meta:

- canvas interativo;
- Pixi, Three, WebGL;
- editor visual;
- assets reais;
- captura real de teclado;
- multiplayer real;
- ECS completo.

---

## Meta 2 - Engine visual/interativa minima

Status: concluida.

Entregas consolidadas:

- RenderSnapshot v1 endurecido para cena crua e componentes visuais;
- Render SVG v1;
- SVG Demo HTML v1;
- Canvas2D Demo v1;
- Browser Playable Demo v1;
- Browser Runtime Loop v1 local ao HTML;
- Asset Manifest v1;
- sprite drawCall;
- `visual.sprite`;
- `tile.layer`;
- `camera.viewport`;
- image loading local opcional com fallback;
- CLI/MCP para fluxos visuais principais;
- matriz e checklist de validacao visual.

Fora de escopo assumido nesta meta:

- Pixi, Three, WebGL;
- renderer real do engine;
- editor visual;
- servidor;
- pipeline pesado de assets;
- colisao resolvida;
- pathfinding;
- chunk streaming;
- animacao avancada;
- multiplayer real.

---

## Meta 3 - V1: jogos pequenos 2D completos

Status: proxima fase.

Objetivo: transformar a engine visual/interativa minima em uma engine capaz de produzir jogos pequenos 2D, ainda com foco em determinismo, contratos e automacao por Codex.

Entregas alvo:

- `collision.bounds` e `CollisionBoundsReport v1` concluidos;
- `CollisionOverlapReport v1` concluido;
- `MovementBlockingReport v1` concluido e endurecido;
- `tile.layer` solido / Tile Collision v1 concluido;
- bloqueio de movimento opt-in no `run-loop` como proximo bloco;
- camera/viewport endurecida;
- Browser Demo usando regras de gameplay reais;
- UI/HUD declarativo minimo;
- audio-lite opcional;
- export de demo jogavel HTML;
- matriz de regressao visual/headless;
- pacote Codex com prompts/skills/subagentes para criar um jogo 2D pequeno.

Status atual da Meta 3: `collision.bounds`, `CollisionOverlapReport v1`, `MovementBlockingReport v1` e Tile Collision v1 ja estao implementados. O proximo bloco recomendado e Movement Blocking opt-in no `run-loop`, sem fisica completa e sem pathfinding.

Criterio de conclusao:

- uma demo 2D pequena com player, mapa, colisao, input, save/load e render browser;
- runtime/CLI/MCP conseguem validar, simular, salvar, carregar, renderizar e diagnosticar;
- Codex consegue adicionar uma mecanica pequena usando workflow padronizado sem quebrar contratos.

Subagentes recomendados:

- `gameplay_worker` para mecanicas e sistemas;
- `render_architect` para impacto visual;
- `perf_auditor` para regressao/determinismo;
- `qa_contract_auditor` para shape de reports, CLI/MCP e schemas.

Linha de trabalho atual recomendada:

1. Movement Blocking opt-in no `run-loop`.
2. Browser Demo com blocking real.
3. Fechamento Meta 3 / V1 small 2D.
4. UI/audio/animation basicos para V2.

---

## Meta 4 - V2: jogos 2D/2.5D de escopo indie

Objetivo: sair de demo e chegar a uma base de producao pequena.

Entregas alvo:

- prefab/template v1;
- scene composition e scene transition;
- UI v1 com menus, HUD e mensagens;
- animacao sprite/tile v1;
- asset atlas v1;
- particulas 2D simples;
- audio v1;
- pathfinding grid v1;
- editor-lite baseado em contratos, ainda automavel por CLI/MCP;
- visual regression basica;
- export/browser build estavel;
- pacote de exemplo: platformer/top-down/RPG-lite.

Criterio de conclusao:

- criar e manter um jogo 2D pequeno com varias cenas, menus, audio, save/load e assets;
- Codex consegue gerar novas cenas/prefabs/mecanicas usando skills e MCP;
- regression matrix cobre gameplay, visual e saves.

---

## Meta 5 - V3: 3D indie / 2.5D avançado

Objetivo: introduzir 3D sem tentar competir com AAA ainda.

Entregas alvo:

- Scene3D Document v1;
- transform 3D;
- camera 3D basica;
- glTF import minimo;
- mesh/material manifest v1;
- render backend 3D inicial, preferencialmente WebGPU quando for adotado;
- lighting basico;
- collision 3D simples;
- navmesh ou navigation graph inicial;
- animation clip/skeletal-lite;
- tooling MCP para validar/importar assets 3D.

Criterio de conclusao:

- demo 3D pequena com camera, mesh, material, movimento, colisao simples e input;
- render backend isolado de gameplay;
- contratos e subagentes continuam governando mudancas.

---

## Meta 6 - V4: runtime/editor AA

Objetivo: amadurecer para producao AA, com editor real e pipeline multiusuario.

Entregas alvo:

- editor visual modular;
- inspector, hierarchy, asset browser e scene view;
- prefab system;
- terrain/tile/level tooling;
- animation graph inicial;
- material system mais completo;
- navmesh/pathfinding robusto;
- profiler e telemetry local;
- build pipeline multi-target;
- plugin Codex do engine com skills, MCP e templates;
- subagentes de QA, render, gameplay, netcode, editor e assets.

Criterio de conclusao:

- equipe pequena consegue produzir um jogo AA de escopo limitado;
- Codex atua como par de desenvolvimento com subagentes especializados e ferramentas MCP do engine.

---

## Meta 7 - V5/V6: caminho para engine 3D AAA

Objetivo: fase aspiracional de longo prazo. Nao deve ser atacada antes das metas anteriores.

Entregas alvo de alto nivel:

- renderer 3D moderno com frame graph;
- PBR completo;
- sombras avancadas;
- GI/reflections conforme backend escolhido;
- skeletal animation robusta;
- cinematic tools;
- streaming de mundos grandes;
- multiplayer/server authoritative robusto;
- physics integration madura;
- asset pipeline profissional;
- editor multiusuario;
- CI/CD, QA automatizado e performance budgets;
- marketplace/plugin system;
- integracao profunda com Codex/subagentes para review, content authoring, profiling e regressao.

Criterio de conclusao:

- nao e apenas tecnologia grafica: precisa pipeline, editor, QA, assets, performance, estabilidade e automacao de equipe.
- AAA depende tanto de tooling e conteudo quanto de renderer.

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
