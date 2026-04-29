# Engine Version Roadmap

Este documento define a progressao da engine por versoes de produto, da V1 voltada a jogos pequenos ate uma visao futura de engine 3D AAA.

A engine e **AI-native**: cada versao deve ser construida de modo que Codex e subagentes consigam entender, validar, modificar e testar o projeto com baixo risco.

## Principios permanentes

- Contratos antes de implementacao.
- Dados versionados antes de comportamento complexo.
- Runtime antes de CLI/MCP.
- CLI/MCP antes de workflows manuais.
- Cross-interface antes de considerar uma feature fechada.
- Docs curtas antes de handoff.
- Subagentes sempre que houver paralelismo natural.
- Nenhum backend grafico deve acoplar gameplay.
- Nenhum editor deve ser GUI-only; sempre deve existir caminho automatizavel.

## V0 - Base AI-native headless e visual minima

Status: concluida pela Meta 1 e Meta 2.

Capacidades:

- validacao de cenas;
- loop headless;
- InputIntent e keyboard scripts;
- save/load minimo;
- RenderSnapshot, SVG, Canvas2D e Browser demo;
- Asset Manifest, visual.sprite, tile.layer e camera.viewport;
- CLI/MCP e testes cross-interface.

Uso esperado:

- validar a arquitetura;
- criar prototipos pequenos;
- permitir que Codex evolua o engine com seguranca.

## V1 - Jogos pequenos 2D

Objetivo: permitir criar jogos pequenos 2D completos.

Capacidades alvo:

- `collision.bounds` concluido;
- CollisionBoundsReport v1 concluido;
- CollisionOverlapReport v1 concluido;
- MovementBlockingReport v1 concluido e endurecido;
- Tile Collision v1 concluido;
- movimento bloqueado opt-in no `run-loop`;
- Browser Demo com blocking real;
- V1 Small 2D readiness gate com cena consolidada;
- Browser Gameplay HUD Lite opt-in;
- hardening de exemplos jogaveis pequenos;
- Playable Save/Load Lite browser-local opt-in;
- Simple HTML Export v1;
- Game Templates v1;
- V1 Small 2D Game Creation Guide / Codex package;
- V1 Small 2D Release Checkpoint;
- UI system simples futuro de V2;
- Audio Lite v1 como primeiro pacote incremental pos-checkpoint;
- save/load jogavel formal futuro, se ainda necessario;
- release checkpoint V1 Small 2D concluido como gate de fechamento.

Codex/subagentes:

- `gameplay_worker` implementa mecanicas;
- `qa_contract_auditor` revisa schemas, fixtures e CLI/MCP;
- `perf_auditor` verifica determinismo e custo;
- `render_architect` revisa impacto visual.

Criterio de saida:

- um jogo 2D pequeno pode ser criado, testado, salvo/carregado e exportado.
- V1 permanece aberta para bugfix, hardening e compatibilidade, enquanto V2 inicia de forma incremental.

## V2 - 2D/2.5D indie production

Objetivo: aumentar escala e conforto para jogos pequenos de producao indie.

Capacidades alvo:

- prefab/templates;
- scene transitions;
- UI system v1;
- audio v1;
- sprite animation v1;
- particle-lite;
- atlas/material manifest;
- editor-lite automatizavel;
- asset pipeline repetivel;
- visual regression;
- build/export workflow.

Codex/subagentes:

- `asset_pipeline_architect` governa assets, atlas e manifests;
- `tooling_editor_architect` governa editor-lite e UX de tooling;
- `docs_handoff_auditor` mantem handoffs e guias de criacao de jogos;
- skills para `create-gameplay-system`, `import-asset-pack` e, em V2, `author-ui-screen`.

Criterio de saida:

- um jogo 2D/2.5D pequeno, com multiplas cenas e UI, pode ser produzido sem refatorar a arquitetura.

## V3 - 3D indie

Objetivo: introduzir 3D de forma controlada.

Capacidades alvo:

- Scene3D Document v1;
- transform 3D;
- camera 3D;
- glTF import minimo;
- mesh/material manifest;
- lighting basico;
- collision 3D simples;
- animation clip lite;
- navigation graph/navmesh inicial;
- WebGPU ou backend 3D escolhido.

Codex/subagentes:

- `render_architect` lidera escolhas de backend e frame graph inicial;
- `asset_pipeline_architect` lidera glTF/material validation;
- `engine_architect` verifica acoplamento entre 2D/3D;
- `perf_auditor` cria budgets iniciais de draw calls/frame time.

Criterio de saida:

- demo 3D pequena com mesh, material, camera, movimento e colisao simples.

## V4 - AA runtime/editor

Objetivo: tornar a engine produtiva para equipe pequena.

Capacidades alvo:

- editor visual modular;
- inspector/hierarchy/scene view;
- prefab system;
- material editor;
- animation graph inicial;
- terrain/level tools;
- profiler;
- build pipeline;
- plugin Codex do engine;
- MCP domain tools para editor, assets, profiling e tests.

Codex/subagentes:

- `tooling_editor_architect` governa editor;
- `qa_contract_auditor` governa regressao;
- `netcode_architect` entra em multiplayer/replication;
- `engine_architect` revisa boundaries de modulo;
- skills especializadas por vertical de jogo.

Criterio de saida:

- equipe pequena consegue produzir jogo AA de escopo controlado.

## V5 - 3D advanced / large games

Objetivo: ampliar performance, mundo e pipeline.

Capacidades alvo:

- renderer com frame graph;
- PBR robusto;
- sombras avancadas;
- streaming de mundo;
- LOD;
- navmesh robusto;
- multiplayer server-authoritative;
- cinematic tools iniciais;
- asset pipeline com cache e import incremental.

Codex/subagentes:

- subagentes por dominio devem rodar em paralelo em worktrees separados;
- MCP deve expor profiling, screenshot comparison, asset validation, shader validation e networking simulation;
- skills devem transformar workflows repetidos em instrucoes permanentes.

Criterio de saida:

- projetos grandes podem ser mantidos com regressao automatica e budgets.

## V6 - Caminho AAA 3D

Objetivo aspiracional de longo prazo.

Capacidades alvo:

- renderer multi-backend;
- PBR completo e iluminacao avancada;
- animation/skeletal system robusto;
- ferramentas cinematograficas;
- multiplayer e streaming em larga escala;
- editor multiusuario;
- pipeline profissional de assets;
- QA e performance automatics;
- integracao Codex/subagentes como parte do workflow de equipe.

Criterio realista:

- AAA nao e apenas grafico. Exige editor, pipeline, conteudo, QA, performance, build, plataforma, documentacao, suporte e equipe.
- A engine so deve perseguir V6 depois que V1-V5 forem demonstradas com projetos reais.

## Linha de trabalho atual recomendada

A partir do estado atual, seguir:

1. `codex/sprite-animation-v1`.
2. UI system/prefab system V2 conforme roadmap, preservando HUD Lite como diagnostico local ate existir UI system formal.
