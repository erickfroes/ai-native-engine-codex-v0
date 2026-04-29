# Handoff para Codex - Estado atual e continuidade

Este repositorio esta pronto para continuar como engine AI-native com Meta 1 e Meta 2 fechadas, e Meta 3 em andamento.

## Estado atual

- Meta 1 Headless: concluida.
- Meta 2 Visual/Interativa minima: concluida.
- Meta 3 Gameplay Foundation: em andamento.
- `collision.bounds` e CollisionBoundsReport v1: concluidos.
- CollisionOverlapReport v1: concluido.
- MovementBlockingReport v1: concluido e endurecido.
- Tile Collision v1: concluido como relatorio diagnostico de tiles solidos.
- Movement Blocking opt-in no `run-loop` e na Browser Playable Demo: concluido.
- V1 Small 2D readiness gate: concluido com cena consolidada.
- Browser Gameplay HUD Lite v1: concluido como HUD local opt-in da Browser Playable Demo.
- Playable Save/Load Lite v1: concluido como export/import JSON browser-local opt-in da Browser Playable Demo.
- V1 Small 2D playable example hardening: concluido com matriz Browser Demo/runtime/CLI/MCP reforcada.

## O que o Codex recebe

- contratos v1 documentados;
- runtime, CLI e MCP alinhados;
- Browser Playable Demo autocontida;
- Asset Manifest, visual.sprite, tile.layer e camera.viewport;
- collision.bounds declarativo;
- CollisionBoundsReport v1;
- CollisionOverlapReport v1;
- MovementBlockingReport v1;
- TileCollisionReport v1;
- Browser Playable Demo com blocking local opt-in;
- Browser Playable Demo com HUD Lite local opt-in;
- Browser Playable Demo com Playable Save/Load Lite local opt-in;
- cena `scenes/v1-small-2d.scene.json` para readiness V1;
- `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`;
- `docs/V1_SMALL_2D_READINESS.md`;
- `docs/V1_SMALL_2D_TEST_MATRIX.md`;
- suites cross-interface;
- roadmap progressivo ate 3D AAA;
- estrategia de subagentes e skills.

## Leitura obrigatoria antes de editar

1. `README.md`
2. `ROADMAP.md`
3. `docs/ENGINE_VERSION_ROADMAP.md`
4. `docs/CODEX_SUBAGENT_STRATEGY.md`
5. `docs/module-contracts.md`
6. `docs/COLLISION_BOUNDS_V1.md`
7. `docs/COLLISION_OVERLAP_V1.md`
8. `docs/MOVEMENT_BLOCKING_V1.md`
9. `docs/TILE_COLLISION_V1.md`
10. `docs/BROWSER_PLAYABLE_DEMO_V1.md`
11. `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`
12. `docs/V1_SMALL_2D_READINESS.md`
13. `docs/V1_SMALL_2D_TEST_MATRIX.md`
14. `AGENTS.md`

## Baseline obrigatorio

```bash
git status -sb
npm test
npm run validate:scenes
npm run smoke
```

Nao implemente feature nova com baseline vermelho.

## Linha de seguimento recomendada

1. Simple HTML Export v1 para empacotar a cena jogavel pequena.
2. Export/save V1 mais formal para exemplo jogavel pequeno, se ainda necessario apos o HTML export.
3. UI/audio/animation basicos para V2.
4. Evitar transformar HUD Lite em UI system completo antes do pacote apropriado.
5. 3D indie apenas depois de V1/V2 demonstradas.

## Uso de subagentes

Pacotes medios devem usar:

- `explorer` para mapear arquivos;
- `engine_architect` ou agente de dominio para design;
- `gameplay_worker` ou worker equivalente para implementar;
- `qa_contract_auditor` para shape de reports, fixtures, CLI/MCP e schemas;
- `perf_auditor` para revisar determinismo e regressao;
- `docs_handoff_auditor` para fechamento documental.

Subagentes adicionais recomendados estao em `.codex/agents/` e descritos em `docs/CODEX_SUBAGENT_STRATEGY.md`.

## Fora de escopo imediato

- Pixi/Three/WebGL como dependencia obrigatoria;
- editor visual completo;
- servidor;
- pipeline pesado de assets;
- multiplayer real;
- pathfinding/chunk streaming antes de colisao tile;
- fisica completa antes de movement blocking opt-in;
- savegame avancado antes de consolidar o export HTML simples;
- 3D antes de consolidar V1/V2.

## Regra pratica de continuidade

Se houver duvida, preserve contratos v1 existentes, adicione fixture/teste primeiro e so depois implemente comportamento.
