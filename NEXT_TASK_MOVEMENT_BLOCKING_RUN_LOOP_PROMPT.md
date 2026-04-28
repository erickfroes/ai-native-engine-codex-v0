# Proxima task recomendada apos Tile Collision v1

## Branch sugerida

```text
codex/movement-blocking-run-loop-v1-package
```

## Objetivo

Integrar Movement Blocking v1 de forma opt-in no `run-loop`, usando `collision.bounds` e Tile Collision v1 como fontes diagnosticas, sem fisica completa, sem pathfinding, sem chunk streaming e sem alterar Browser Demo ainda.

## Prompt para Codex

```text
Use a branch de feature:
codex/movement-blocking-run-loop-v1-package

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
- docs/COLLISION_BOUNDS_V1.md
- docs/COLLISION_OVERLAP_V1.md
- docs/MOVEMENT_BLOCKING_V1.md
- docs/TILE_LAYER_V1.md
- docs/TILE_COLLISION_V1.md

Objetivo:
Adicionar blocking opt-in no `run-loop`, preservando comportamento padrao sem flags/opcoes.

Restricoes:
- nao adicionar fisica completa;
- nao adicionar pathfinding;
- nao adicionar chunk streaming;
- nao alterar RenderSnapshot v1;
- nao alterar Browser Demo neste pacote;
- nao quebrar InputIntent v1;
- nao quebrar MovementBlockingReport v1;
- nao quebrar TileCollisionReport v1.

Antes de finalizar:
- npm test
- npm run validate:scenes
- npm run smoke

Ao final, diga explicitamente: "pode mergear" ou "nao mergear ainda".
```
