# State Simulation Report v1

## Objetivo

Definir contrato opt-in de saída da simulação de estado baseada em State Model v1 + State Processor Registry v1.

## Contrato

- schema formal: `docs/schemas/state-simulation-report-v1.schema.json`.

Campos principais:

- `stateSimulationReportVersion: 1`
- `scene`, `ticks`, `seed`, `ticksExecuted`
- `processors[]` (metadados dos processadores aplicados)
- `initialSnapshot` (`StateSnapshot v1`)
- `finalSnapshot` (`StateSnapshot v1`)
- `steps[]` (tick + processadores executados + entities mutadas)

## Compatibilidade

- Não altera `LoopReport v1`.
- Não altera `LoopTrace v1`.
- Não altera `ExecutionPlan v1`.
- Não altera `run-loop`/`run_loop` padrão.
