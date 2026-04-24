# System Registry v1

## Objetivo

Centralizar a fonte de verdade dos systems mínimos conhecidos do loop headless para evitar drift entre:

- runtime;
- trace;
- testes;
- documentação.

## Shape

```json
{
  "registryVersion": 1,
  "systems": [
    {
      "name": "core.loop",
      "delta": 1,
      "deterministic": true
    }
  ]
}
```

Schema formal: `docs/schemas/system-registry-v1.schema.json`.

## Systems conhecidos (v1)

- `core.loop`: `delta=1`
- `input.keyboard`: `delta=3`
- `networking.replication`: `delta=2`

Todos os systems acima são `deterministic: true`.

## Semântica de delta

No loop headless mínimo atual, cada system conhecido aplica:

`stateAfter = (stateBefore + delta) >>> 0`

## Relação com LoopReport v1

- `executedSystems` preserva a ordem declarada na cena.
- `finalState` reflete a composição dos deltas do registry para os systems conhecidos.
- shape do `LoopReport v1` permanece inalterado.

## Relação com LoopTrace v1

- `trace.systemsPerTick[].systems[].delta` para systems conhecidos deve refletir o `delta` declarado no registry.
- shape do `LoopTrace v1` permanece inalterado.

## System desconhecido

Systems não listados no registry continuam usando fallback determinístico previsível já existente.
O registry não altera o contrato atual para systems desconhecidos.

