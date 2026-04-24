# State Snapshot v1

## Objetivo

Definir um contrato opt-in serializável para inspeção do estado inicial estruturado, derivado de `State Model v1`.

## Contrato

- schema formal: `docs/schemas/state-snapshot-v1.schema.json`.

Shape:

```json
{
  "stateSnapshotVersion": 1,
  "scene": "tutorial",
  "seed": 1337,
  "tick": 0,
  "entities": [
    {
      "id": "player.hero",
      "name": "Hero",
      "components": {
        "transform": { "fields": { "position": { "x": 0, "y": 0, "z": 0 } }, "replicated": true, "version": 1 }
      }
    }
  ]
}
```

## Regras

- É apenas **inspeção** (opt-in).
- Deve ser serializável e determinístico.
- Não é embutido em `LoopReport v1`.
- Não substitui report/trace do loop mínimo.

## Interfaces

- Runtime: `createInitialStateFromScene` + `snapshotStateV1`.
- CLI (opt-in): `inspect-state`.
- MCP (opt-in): `inspect_state`.
