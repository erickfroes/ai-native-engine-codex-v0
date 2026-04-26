# STATUS - Engine AI-native

## Estado atual

A Meta 1 Headless e a Meta 2 Visual/Interativa estao concluidas como bases de engine pequenas, deterministicas e automatizaveis por Codex.

O projeto agora entra na Meta 3, cujo foco e **Gameplay Foundation**: colisao, overlap, bloqueio de movimento, colisao com tile layer e uma demo browser com regras reais de gameplay.

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
- CLI/MCP para fluxos principais;
- testes cross-interface.

## Foco atual recomendado

1. Collision Overlap Report v1.
2. Movement Blocking v1.
3. Tile Collision v1.
4. Browser Demo com blocking real.
5. Fechamento da V1 Small 2D Games.

## Versoes de produto

- V1: jogos pequenos 2D.
- V2: jogos 2D/2.5D indie production.
- V3: 3D indie.
- V4: runtime/editor AA.
- V5/V6: caminho aspiracional para 3D AAA.

Detalhes: `docs/ENGINE_VERSION_ROADMAP.md`.

## Riscos atuais

- expandir gameplay sem contratos de colisao/movimento;
- acoplar browser demo ao runtime canonico;
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
