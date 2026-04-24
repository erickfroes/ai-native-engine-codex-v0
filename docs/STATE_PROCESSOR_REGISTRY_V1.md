# State Processor Registry v1

## Objetivo

Definir catálogo interno de processadores de estado do State Model v1.

## Contrato

- schema formal: `docs/schemas/state-processor-registry-v1.schema.json`.

Shape:

- `stateProcessorRegistryVersion: 1`
- `processors[]` com `name`, `version`, `deterministic`, `requiredComponents`.

Processador inicial:

- `movement.integrate`:
  - requer `transform` + `velocity`;
  - por tick: `transform.x += velocity.x` e `transform.y += velocity.y`.

## Separação de responsabilidade

- Não altera `Loop Scheduler v1`.
- Não altera `System Registry v1`.
- É opt-in e usado apenas pela simulação de estado.
