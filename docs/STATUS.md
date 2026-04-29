# STATUS - Engine AI-native

## Estado atual

A Meta 1 Headless e a Meta 2 Visual/Interativa estao concluidas como bases pequenas, deterministicas e automatizaveis por Codex.

O projeto esta com a Meta 3 em estado **V1 Small 2D release-checkpointed**: colisao, overlap, bloqueio de movimento, colisao com tile layer, Browser Demo com regras reais de gameplay, templates, export HTML simples e workflow Codex-first estao documentados e validados.

Neste ponto, a fundacao de gameplay por entidade e tile ja existe:

- `collision.bounds`;
- CollisionBoundsReport v1;
- CollisionOverlapReport v1;
- MovementBlockingReport v1;
- TileCollisionReport v1;
- blocking opt-in no `run-loop` e na Browser Playable Demo;
- CLI/MCP e runtime para inspecao de bounds, overlaps, tile collision e blocking;
- hardening de bordas do Movement Blocking v1.

## Capacidades consolidadas

- contratos v1 e schemas documentados;
- runtime headless deterministico;
- loop interpretavel;
- InputIntent v1 e KeyboardInputScript v1;
- save/load v1 minimo;
- State Simulation v1 e State Mutation Trace v1;
- RenderSnapshot v1;
- Render SVG v1;
- Canvas2D Demo v1;
- Browser Playable Demo v1;
- Browser Runtime Loop v1;
- Asset Manifest v1;
- sprite drawCall;
- `visual.sprite`;
- `tile.layer`;
- `camera.viewport`;
- image loading local com fallback;
- `collision.bounds` e CollisionBoundsReport v1;
- CollisionOverlapReport v1;
- MovementBlockingReport v1;
- TileCollisionReport v1;
- Browser Playable Demo movement blocking opt-in;
- Browser Gameplay HUD Lite v1 opt-in;
- Playable Save/Load Lite v1 browser-local opt-in;
- Simple HTML Export v1;
- Game Templates v1 com `top-down-basic` e `side-view-blocking-basic`;
- V1 Small 2D Game Creation Guide / Codex package;
- V1 Small 2D Release Checkpoint;
- V1 Small 2D Capability Matrix;
- V1 Small 2D Release Validation;
- V1 Small 2D readiness gate com cena consolidada (`docs/V1_SMALL_2D_READINESS.md`);
- V1 Small 2D playable example hardening;
- CLI/MCP para fluxos principais;
- testes cross-interface.

## Foco atual recomendado

1. `codex/audio-lite-v1`.
2. `codex/sprite-animation-v1`.
3. UI system/prefab system V2 conforme roadmap, sem transformar HUD Lite em UI system completo antes do pacote apropriado.

## Versoes de produto

- V1: jogos pequenos 2D.
- V2: jogos 2D/2.5D indie production.
- V3: 3D indie.
- V4: runtime/editor AA.
- V5/V6: caminho aspiracional para 3D AAA.

Detalhes: `docs/ENGINE_VERSION_ROADMAP.md`.

## Riscos atuais

- aplicar blocking real sem contrato opt-in explicito no `run-loop` ou Browser Demo;
- acoplar Browser Demo ao runtime canonico como se fosse loop oficial;
- transformar HUD browser lite em sistema de UI completo antes do pacote V2 apropriado;
- confundir Playable Save/Load Lite browser-local com `savegame v1` ou `State Snapshot v1`;
- transformar Simple HTML Export v1 em bundler, servidor ou build pipeline V2;
- transformar Game Templates v1 em template engine, prefab system ou editor;
- transformar o Game Creation Guide em scaffolder, prefab system ou gerador magico;
- criar editor antes de solidificar V1 gameplay;
- criar pipeline de assets pesado antes de uma demo jogavel real;
- usar subagentes sem delimitar escopo, gerando patches conflitantes.

## Validacao obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Regra de continuidade

Toda proxima feature deve seguir o padrao:

contrato -> fixture -> runtime -> CLI/MCP -> cross-interface -> docs -> hardening.
