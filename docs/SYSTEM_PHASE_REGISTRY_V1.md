# System Phase Registry v1

## Objetivo

Classificar systems conhecidos por fase lógica, como metadata interna de governança, sem alterar execução real.

## Relação com contratos existentes

- `System Registry v1` continua fonte de verdade para `name`, `delta` e `deterministic`.
- `Loop Scheduler v1` continua fonte de verdade para ordem real por tick.
- `System Phase Registry v1` não reorganiza execução nesta versão.

## Shape

```json
{
  "phaseRegistryVersion": 1,
  "phases": [
    { "name": "core", "order": 0, "description": "..." }
  ],
  "systemPhases": [
    { "system": "core.loop", "phase": "core" }
  ]
}
```

Schema formal: `docs/schemas/system-phase-registry-v1.schema.json`.

## Fases atuais

- `core` (order `0`)
- `input` (order `10`)
- `networking` (order `20`)

## Systems atuais e fases

- `core.loop` -> `core`
- `input.keyboard` -> `input`
- `networking.replication` -> `networking`

## Evolução futura

Fases/prioridades reais de execução podem ser introduzidas em evolução separada (ex.: scheduler v2), preservando contratos v1 atuais.

