# STATUS - Engine AI-native

## Estado atual

A Meta 1 Headless e a Meta 2 Visual/Interativa estao concluidas como bases pequenas, deterministicas e automatizaveis por Codex.

O projeto esta na Meta 3, cujo foco e **Gameplay Foundation**: colisao, overlap, bloqueio de movimento, colisao com tile layer e uma demo browser com regras reais de gameplay.

Neste ponto, a fundacao de colisao por entidade ja existe:

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
- CLI/MCP para fluxos principais;
- testes cross-interface.

## Foco atual recomendado

1. Fechamento e hardening da V1 Small 2D Games.
2. Integracoes basicas de UI/audio/animation para V2.
3. Consolidacao de exemplos jogaveis pequenos.

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
