# ExecutionPlan v1

## Objetivo

Permitir inspeção prévia da ordem de execução do loop headless sem executar handlers.

## Shape

```json
{
  "executionPlanVersion": 1,
  "scene": "string",
  "ticks": 0,
  "seed": 1337,
  "valid": true,
  "validation": { "...": "SceneValidationReportV1" },
  "systemsPerTick": [
    {
      "tick": 1,
      "systems": [
        {
          "name": "core.loop",
          "known": true,
          "delta": 1,
          "deterministic": true,
          "order": 0
        }
      ]
    }
  ],
  "estimated": {
    "initialState": 1337,
    "totalDelta": 0,
    "finalState": 1337
  }
}
```

Schema formal: `docs/schemas/execution-plan-v1.schema.json`.

## Semântica

- não executa loop/handlers;
- usa `SceneValidationReport v1` em `validation`;
- `valid` espelha `validation.valid`;
- `seed` resolve para `1337` quando omitida;
- `systemsPerTick` descreve a ordem por tick com `order` zero-based;
- `estimated` usa deltas de systems conhecidos no `System Registry v1`.

## Relação com outros contratos

- `SceneValidationReport v1`: validação pré-execução;
- `ExecutionPlan v1`: planejamento sem execução;
- `LoopReport v1`: resultado real da execução;
- `LoopTrace v1`: diagnóstico real opt-in da execução;
- `System Registry v1`: fonte de nome/delta/determinismo de systems conhecidos.

