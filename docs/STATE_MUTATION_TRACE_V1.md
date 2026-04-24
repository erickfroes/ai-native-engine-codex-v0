# State Mutation Trace v1

## Objetivo

`StateMutationTrace v1` define um contrato serializável para diagnóstico opt-in de mutações aplicadas por processadores de estado durante simulação.

Ele existe para responder, de forma determinística e revisável:

- qual processador executou em cada tick;
- quais entidades/componentes foram mutados;
- qual era o estado `before` e `after`;
- quais campos mudaram (`fieldsChanged`).

## Formato

Schema formal:

- `docs/schemas/state-mutation-trace-v1.schema.json`

Campos principais:

- `stateMutationTraceVersion` (constante `1`);
- `scene`;
- `ticks`;
- `seed`;
- `ticksExecuted`;
- `mutationsByTick[]`.

Estrutura por tick:

- `tick`;
- `processors[]`;
  - `name`;
  - `mutations[]`;
    - `entityId`;
    - `component`;
    - `before` (objeto livre);
    - `after` (objeto livre);
    - `fieldsChanged[]`.

## Relação com StateSimulationReport v1

- `StateSimulationReport v1` continua sendo o contrato base de resultado da simulação.
- `StateMutationTrace v1` complementa o report quando diagnóstico detalhado é necessário.
- O trace não substitui o report; ele adiciona granularidade de mutação por tick/processador.

## Relação com StateSnapshot v1

- `StateSnapshot v1` representa snapshots completos de estado (inicial/final).
- `StateMutationTrace v1` representa apenas diferenças aplicadas ao longo dos ticks.
- Snapshot e trace são complementares: snapshot mostra estado, trace mostra transições.

## Relação com State Processor Registry v1

- Cada entrada em `processors[].name` no trace corresponde a processadores do fluxo de simulação.
- A semântica desses nomes é governada pelo `State Processor Registry v1`.
- O trace não redefine metadados do processador; apenas registra mutações observadas.

## Por que é opt-in

O trace é opt-in porque:

- aumenta volume de payload;
- é orientado a diagnóstico e auditoria, não ao caminho padrão;
- evita custo adicional para consumidores que precisam só do report.

## Por que não altera contratos v1 existentes

Este contrato:

- não muda o shape de `StateSimulationReport v1`;
- não muda `StateSnapshot v1`;
- não muda contratos padrão de loop/validação/planejamento;
- adiciona apenas um contrato documental e versionado separado (`StateMutationTrace v1`).
