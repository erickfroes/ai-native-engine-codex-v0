# Proxima task recomendada apos Movement Blocking

## Branch sugerida

```text
codex/tile-collision-v1-package
```

## Objetivo

Adicionar Tile Collision v1 usando `tile.layer` como fonte declarativa de tiles solidos, sem pathfinding, sem chunk streaming, sem fisica completa e sem alterar Browser Demo ainda.

## Prompt para Codex

```text
Use a branch de feature:
codex/tile-collision-v1-package

Antes de editar:
- git status -sb
- git log --oneline -n 10
- git remote -v
- npm test
- npm run validate:scenes
- npm run smoke

Se estiver em main, pare e me avise.
Se a baseline falhar antes de editar, pare e me avise.

Leia e respeite:
- AGENTS.md
- ROADMAP.md
- docs/ENGINE_VERSION_ROADMAP.md
- docs/CODEX_SUBAGENT_STRATEGY.md
- docs/CODEX_HANDOFF.md
- docs/STATUS.md
- docs/module-contracts.md
- docs/TILE_LAYER_V1.md
- docs/COLLISION_BOUNDS_V1.md
- docs/COLLISION_OVERLAP_V1.md
- docs/MOVEMENT_BLOCKING_V1.md

Use subagentes:
- explorer: mapear tile.layer, collision.bounds, MovementBlockingReport v1 e fixtures.
- engine_architect: confirmar que este pacote pertence a Meta 3 / V1 small 2D.
- gameplay_worker: implementar somente o pacote aprovado.
- qa_contract_auditor: revisar shape de reports, schemas, fixtures, CLI/MCP e cross-interface.
- perf_auditor: revisar determinismo e custo de consulta em grid pequeno.
- render_architect: confirmar que Tile Collision nao altera RenderSnapshot ou Browser Demo.
- docs_handoff_auditor: revisar documentacao curta.

Objetivo:
Adicionar Tile Collision v1 para declarar tiles solidos em `tile.layer` e gerar report diagnostico de colisao com tiles, sem bloquear movimento ainda.

Pode implementar em ate 6 commits pequenos neste PR.

Pacote:
1. Contrato para tiles solidos em `tile.layer` ou extensao compativel da palette.
2. Runtime TileCollisionReport v1.
3. Fixtures e testes runtime.
4. CLI `inspect-tile-collision`.
5. MCP `inspect_tile_collision`.
6. Cross-interface + docs.

Restricoes:
- nao alterar run-loop;
- nao alterar Browser Demo;
- nao adicionar pathfinding;
- nao adicionar chunk streaming;
- nao adicionar fisica completa;
- nao alterar RenderSnapshot v1;
- nao alterar MovementBlockingReport v1;
- nao quebrar tile.layer existente.

Antes de finalizar:
- npm test
- npm run validate:scenes
- npm run smoke

Ao final, entregue:
A) subagentes usados
B) commits criados
C) diff resumido por commit
D) arquivos principais
E) testes executados
F) formato do TileCollisionReport v1
G) comportamento com tile solido
H) comportamento sem tiles solidos
I) fora de escopo
J) hashes dos commits
K) diga explicitamente: "pode mergear" ou "nao mergear ainda"
```
