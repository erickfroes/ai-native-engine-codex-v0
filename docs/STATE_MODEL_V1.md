# State Model v1

## Objetivo

Definir uma representação interna mínima de estado estruturado construída a partir do **Scene Document v1**, sem alterar contratos públicos v1 já existentes do loop.

## Escopo

- **Interno** ao runtime.
- Pode evoluir com novas capacidades de gameplay/simulação.
- Não substitui `LoopReport v1`, `LoopTrace v1` ou `ExecutionPlan v1`.

## Shape interno atual

```json
{
  "stateVersion": 1,
  "scene": "tutorial",
  "seed": 1337,
  "tick": 0,
  "entities": [
    {
      "id": "player.hero",
      "name": "Hero",
      "components": {
        "transform": { "fields": { "position": { "x": 0, "y": 0, "z": 0 } }, "replicated": true, "version": 1 },
        "sprite": { "fields": { "asset": "sprites/player_idle.png" }, "replicated": false, "version": 1 }
      }
    }
  ],
  "resources": {
    "assets": ["sprites/player_idle.png"],
    "metadata": { "name": "tutorial" }
  }
}
```

## Regras atuais

- `seed` omitido resolve para `1337`.
- `tick` inicial é `0`.
- ordem de `entities` segue o Scene Document v1.
- `components` são materializados como objeto indexado por `kind` e serializável.

## Compatibilidade

- Esta etapa **não altera**:
  - `LoopReport v1`;
  - `LoopTrace v1`;
  - `ExecutionPlan v1`;
  - `SceneValidationReport v1`;
  - semântica atual dos systems mínimos.
