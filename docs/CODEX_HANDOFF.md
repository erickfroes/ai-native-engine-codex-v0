# Handoff para Codex - Estado atual e continuidade

Este repositorio esta pronto para continuar como engine AI-native com Meta 1 e Meta 2 fechadas, e Meta 3 em estado V1 Small 2D release-checkpointed.

## Estado atual

- Meta 1 Headless: concluida.
- Meta 2 Visual/Interativa minima: concluida.
- Meta 3 Gameplay Foundation: V1 Small 2D release-checkpointed.
- `collision.bounds` e CollisionBoundsReport v1: concluidos.
- CollisionOverlapReport v1: concluido.
- MovementBlockingReport v1: concluido e endurecido.
- Tile Collision v1: concluido como relatorio diagnostico de tiles solidos.
- Movement Blocking opt-in no `run-loop` e na Browser Playable Demo: concluido.
- V1 Small 2D readiness gate: concluido com cena consolidada.
- Browser Gameplay HUD Lite v1: concluido como HUD local opt-in da Browser Playable Demo.
- Playable Save/Load Lite v1: concluido como export/import JSON browser-local opt-in da Browser Playable Demo.
- V1 Small 2D playable example hardening: concluido com matriz Browser Demo/runtime/CLI/MCP reforcada.
- Simple HTML Export v1: concluido como export de arquivo HTML jogavel simples.
- Game Templates v1: concluido como exemplos copiar-e-adaptar para V1 Small 2D.
- V1 Small 2D Game Creation Guide / Codex package: concluido como workflow Codex-first para criar jogos pequenos a partir dos templates.
- V1 Small 2D Release Checkpoint: concluido como fechamento documental, matriz de capacidade e validacao canonica.
- Audio Lite v1: concluido como diagnostico declarativo e opt-in browser/export.
- UI System v1: concluido como contrato declarativo de `ui.screen` com arvore de widgets, report runtime/CLI/MCP e consumo visual opt-in na Browser Demo/export.
- Sprite Animation v1: concluido como diagnostico declarativo runtime/CLI/MCP e consumo visual opt-in na Browser Demo para sprites asset-backed.
- Portable HTML Export v2: concluido como export portatil com assets inline e consumo visual opt-in de Sprite Animation v1, preservando `RenderSnapshot v1` e mantendo `Simple HTML Export v1` fechado.
- Portable HTML Export v2 unsupported-extension hardening: concluido com erro previsivel para assets fora das extensoes inline suportadas (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.svg`) em runtime/CLI/MCP, sem mutar `Asset Manifest v1`.
- Portable HTML Export v2 no-manifest spriteAnimation fallback hardening: concluido com cobertura runtime/CLI/MCP para `spriteAnimation` sem `assetManifestPath`, preservando `metadata.spriteAnimation` opt-in quando solicitado e mantendo drawCalls no fallback `rect`, sem `data:` URL inline e sem `file:///`.
- Prefab System v1: concluido como resolucao declarativa minima por arquivo e report diagnostico runtime/CLI/MCP.
- Prefab Validation Report v1: concluido como validacao direta de `.prefab.json` via runtime/CLI/MCP.
- Prefab follow-up baseline sem `components` explicitos em entidade prefab-backed: concluido e promovido para a linha viva de continuidade.
- Cena `scenes/prefab-instanced.scene.json`: endurecida com 3 entidades reutilizando o mesmo prefab, incluindo uma entidade sem `components` explicitos, validada por runtime/CLI/MCP.
- Prefab Usage Report v2: concluido como diagnostico opt-in com `absolutePath`, `entityPath`, `prefabAbsolutePath`, paths de componente e overrides explicitos via runtime/CLI/MCP, preservando `v1`.

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
- `visual.sprite.animation` com `inspect-sprite-animation` / `inspect_sprite_animation` e `render-browser-demo --sprite-animation` / `render_browser_demo({ spriteAnimation: true })`;
- `export-portable-html-game` / `export_portable_html_game` com `--asset-manifest` e `--sprite-animation` para HTML portatil com assets inline;
- `ui.screen` declarativo com widget tree serializavel, `inspect-ui-system` / `inspect_ui_system` e `render-browser-demo --ui-system` / `export-html-game --ui-system`;
- `entity.prefab` resolvido por arquivo local seguro em `loadSceneFile` e consumidores por path;
- entidade prefab-backed pode omitir `components` quando nao ha override local;
- `scenes/prefab-instanced.scene.json` demonstra reutilizacao real do mesmo prefab em multiplas entidades sem semantica nova;
- `validate-prefab` / `validate_prefab` para validar prefab sem depender de uma cena;
- `inspect-prefab-usage` / `inspect_prefab_usage`;
- `inspect-prefab-usage-v2` / `inspect_prefab_usage_v2` para rastreabilidade opt-in de paths/origins/overrides;
- `export-html-game` / `export_html_game` para escrever HTML jogavel autocontido;
- `templates/top-down-basic` e `templates/side-view-blocking-basic`;
- cena `scenes/v1-small-2d.scene.json` para readiness V1;
- `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`;
- `docs/SIMPLE_HTML_EXPORT_V1.md`;
- `docs/GAME_TEMPLATES_V1.md`;
- `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`;
- `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`;
- `docs/codex-packages/V1_SMALL_2D_CREATE_GAME_PACKAGE.md`;
- `docs/examples/V1_SMALL_2D_GAME_PLAN_EXAMPLE.md`;
- `docs/V1_SMALL_2D_RELEASE_CHECKPOINT.md`;
- `docs/V1_SMALL_2D_CAPABILITY_MATRIX.md`;
- `docs/V1_SMALL_2D_RELEASE_VALIDATION.md`;
- `docs/V1_SMALL_2D_READINESS.md`;
- `docs/V1_SMALL_2D_TEST_MATRIX.md`;
- `docs/AUDIO_LITE_V1.md`;
- `docs/UI_SYSTEM_V1.md`;
- `docs/SPRITE_ANIMATION_V1.md`;
- `docs/PORTABLE_HTML_EXPORT_V2.md`;
- `docs/PREFAB_SYSTEM_V1.md`;
- `docs/PREFAB_VALIDATION_REPORT_V1.md`;
- suites cross-interface;
- roadmap progressivo ate 3D AAA;
- estrategia de subagentes e skills.

## Leitura obrigatoria antes de editar

1. `README.md`
2. `docs/CODEX_HANDOFF.md`
3. `SPEC.md`
4. `docs/module-contracts.md`
5. `schemas/`
6. `AGENTS.md`
7. `ROADMAP.md`
8. `docs/ENGINE_VERSION_ROADMAP.md`
9. `docs/CODEX_SUBAGENT_STRATEGY.md`
10. `docs/COLLISION_BOUNDS_V1.md`
11. `docs/COLLISION_OVERLAP_V1.md`
12. `docs/MOVEMENT_BLOCKING_V1.md`
13. `docs/TILE_COLLISION_V1.md`
14. `docs/BROWSER_PLAYABLE_DEMO_V1.md`
15. `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`
16. `docs/SIMPLE_HTML_EXPORT_V1.md`
17. `docs/GAME_TEMPLATES_V1.md`
18. `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`
19. `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`
20. `docs/codex-packages/V1_SMALL_2D_CREATE_GAME_PACKAGE.md`
21. `templates/top-down-basic/README.md`
22. `templates/side-view-blocking-basic/README.md`
23. `docs/V1_SMALL_2D_RELEASE_CHECKPOINT.md`
24. `docs/V1_SMALL_2D_CAPABILITY_MATRIX.md`
25. `docs/V1_SMALL_2D_RELEASE_VALIDATION.md`
26. `docs/V1_SMALL_2D_READINESS.md`
27. `docs/V1_SMALL_2D_TEST_MATRIX.md`
28. `docs/AUDIO_LITE_V1.md`
29. `docs/UI_SYSTEM_V1.md`
30. `docs/SPRITE_ANIMATION_V1.md`
31. `docs/PREFAB_SYSTEM_V1.md`
32. `docs/PREFAB_VALIDATION_REPORT_V1.md`

## Baseline obrigatorio

```bash
git status -sb
npm test
npm run validate:scenes
npm run smoke
```

Nao implemente feature nova com baseline vermelho.

## Linha de seguimento recomendada

1. Continuar o hardening incremental de `Portable HTML Export v2` cobrindo explicitamente o caminho no-op com `assetManifestPath` e `spriteAnimation` quando a cena nao produz drawCalls `sprite` asset-backed, preservando `RenderSnapshot v1`, `Simple HTML Export v1` e o caminho default da Browser Demo.
2. 3D indie apenas depois de V1/V2 demonstradas.

## Regra de manutencao da linha de seguimento

- Ao concluir um slice validado, atualizar este arquivo no mesmo pacote.
- Registrar o que acabou de ficar pronto e remover da linha o que ja foi fechado.
- Reescrever a linha de seguimento para apontar o menor proximo passo seguro do estado atual.
- Antes de iniciar feature nova, seguir esta linha viva salvo bloqueio documentado ou redirecionamento explicito do usuario.

## Uso de subagentes

Pacotes medios e grandes devem usar:

- `explorer` para mapear arquivos;
- `engine_architect` ou agente de dominio para design;
- `gameplay_worker` ou worker equivalente para implementar;
- `qa_contract_auditor` para shape de reports, fixtures, CLI/MCP e schemas;
- `perf_auditor` para revisar determinismo e regressao;
- `docs_handoff_auditor` para fechamento documental.

Subagentes adicionais recomendados estao em `.codex/agents/` e descritos em `docs/CODEX_SUBAGENT_STRATEGY.md`.
Se a tarefa tocar handoff, roadmap ou continuidade, incluir `docs_handoff_auditor`.

## Fora de escopo imediato

- Pixi/Three/WebGL como dependencia obrigatoria;
- editor visual completo;
- servidor;
- pipeline pesado de assets;
- multiplayer real;
- pathfinding/chunk streaming antes de colisao tile;
- fisica completa antes de movement blocking opt-in;
- transformar Simple HTML Export v1 em bundler, servidor ou build pipeline V2;
- transformar Game Templates v1 em template engine, prefab system ou editor;
- transformar o Game Creation Guide em template engine, prefab system, scaffolder obrigatorio ou editor;
- savegame avancado antes de validar templates pequenos;
- 3D antes de consolidar V1/V2.

## Regra pratica de continuidade

Se houver duvida, preserve contratos v1 existentes, adicione fixture/teste primeiro e so depois implemente comportamento.

## Formato de entrega ao usuario

Ao concluir cada passo relevante ou tarefa completa, responder sempre com:

- `Resumo`: o que mudou, foi validado ou ficou decidido.
- `Checklist`: contratos, testes, docs e riscos pendentes em lista curta.

Nao depender de o usuario pedir esse formato novamente.
