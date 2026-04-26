# Handoff para Codex - Estado atual e continuidade

Este repositorio esta pronto para continuar como engine AI-native com Meta 1 e Meta 2 fechadas.

## Estado atual

- Meta 1 Headless: concluida.
- Meta 2 Visual/Interativa minima: concluida.
- Meta 3 Gameplay Foundation: iniciada com `collision.bounds` e CollisionBoundsReport v1.

## O que o Codex recebe

- contratos v1 documentados;
- runtime, CLI e MCP alinhados;
- Browser Playable Demo autocontida;
- Asset Manifest, visual.sprite, tile.layer e camera.viewport;
- collision.bounds inicial;
- suites cross-interface;
- roadmap progressivo ate 3D AAA;
- estrategia de subagentes e skills.

## Leitura obrigatoria antes de editar

1. `README.md`
2. `ROADMAP.md`
3. `docs/ENGINE_VERSION_ROADMAP.md`
4. `docs/CODEX_SUBAGENT_STRATEGY.md`
5. `docs/module-contracts.md`
6. `AGENTS.md`

## Baseline obrigatorio

```bash
git status -sb
npm test
npm run validate:scenes
npm run smoke
```

Nao implemente feature nova com baseline vermelho.

## Linha de seguimento recomendada

1. Collision Overlap Report v1.
2. Movement Blocking v1.
3. Tile Collision v1.
4. Browser Demo usando blocking real.
5. Fechamento V1 Small 2D.
6. UI/audio/animation basicos para V2.
7. 3D indie apenas depois de V1/V2 demonstradas.

## Uso de subagentes

Pacotes medios devem usar:

- explorer para mapear arquivos;
- agente de dominio para design;
- gameplay_worker ou worker equivalente para implementar;
- perf_auditor ou qa_contract_auditor para revisar determinismo e regressao.

Subagentes adicionais recomendados estao em `.codex/agents/` e descritos em `docs/CODEX_SUBAGENT_STRATEGY.md`.

## Fora de escopo imediato

- Pixi/Three/WebGL como dependencia obrigatoria;
- editor visual completo;
- servidor;
- pipeline pesado de assets;
- multiplayer real;
- pathfinding/chunk streaming antes de colisao base;
- 3D antes de consolidar V1/V2.

## Regra pratica de continuidade

Se houver duvida, preserve contratos v1 existentes, adicione fixture/teste primeiro e so depois implemente comportamento.
