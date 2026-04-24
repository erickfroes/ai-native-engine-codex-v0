# Loop Scheduler v1

## Objetivo

Centralizar internamente a ordem de execução dos systems do loop headless para evitar drift entre:

- planejamento (`ExecutionPlan v1`);
- execução (`LoopReport v1`);
- diagnóstico (`LoopTrace v1`).

## Escopo

`Loop Scheduler v1` é **interno**.
Ele não é um contrato público de CLI/MCP nesta versão.

## Semântica atual

- ordem por tick = ordem declarada na scene;
- cada tick repete a mesma sequência;
- `order` é índice zero-based do system dentro do tick;
- systems conhecidos incluem metadados do `System Registry v1`;
- systems desconhecidos permanecem `known: false` (sem alterar comportamento de fallback/erro já existente).

## Não inclui ainda

- fases de execução;
- prioridades;
- scheduler multi-stage.

Essas evoluções devem entrar em versão separada.

