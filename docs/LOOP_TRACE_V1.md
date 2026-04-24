# LoopTrace v1

## Objetivo

Contrato opt-in de diagnóstico para o loop headless nas interfaces:

- runtime
- CLI `run-loop --json --trace`
- MCP `run_loop` com `trace: true`

`LoopTrace v1` **não substitui** o `LoopReport v1`. O report continua o contrato estável de resultado.

## Shape

```json
{
  "traceVersion": 1,
  "scene": "string",
  "ticks": 0,
  "seed": 0,
  "ticksExecuted": 0,
  "systemsPerTick": [
    {
      "tick": 1,
      "systems": [
        {
          "name": "core.loop",
          "delta": 1,
          "stateBefore": 10,
          "stateAfter": 11
        }
      ]
    }
  ]
}
```

Schema formal: `docs/schemas/loop-trace-v1.schema.json`.

## Envelope sugerido para interfaces externas

Quando trace estiver ativado na CLI/MCP, o payload é retornado em envelope:

```json
{
  "report": { "...": "LoopReportV1" },
  "trace": { "...": "LoopTraceV1" }
}
```

Sem trace, o comportamento padrão permanece inalterado:

- CLI retorna somente `LoopReport v1`.
- MCP retorna `structuredContent` em `LoopReport v1`.
