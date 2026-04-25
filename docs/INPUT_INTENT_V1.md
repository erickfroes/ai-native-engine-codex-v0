# Input Intent v1

## Objetivo

Definir um contrato de input headless orientado a intenção, com integração opt-in no loop headless sem alterar `Scene Document v1`, `simulate-state` ou o shape dos contratos de saída já publicados.

## Shape mínimo

```json
{
  "inputIntentVersion": 1,
  "tick": 1,
  "entityId": "player",
  "actions": [
    {
      "type": "move",
      "axis": {
        "x": 1,
        "y": 0
      }
    }
  ]
}
```

## Regras v1

- `inputIntentVersion` deve ser exatamente `1`.
- `tick` é inteiro e começa em `1`.
- `entityId` identifica a entidade alvo do intent.
- `actions` preserva a ordem declarada no documento.
- v1 suporta apenas `actions[].type = "move"`.
- `axis.x` e `axis.y` são inteiros no intervalo `[-1, 1]`.
- não há campos extras nos níveis controlados do contrato.

## Escopo

- contrato de input headless isolado;
- validação local no runtime;
- fixtures mínimas válidas/inválidas.
- integração opt-in com `runMinimalSystemLoop`, `run-loop` e `run_loop`.

## Integração opt-in com o loop headless

- runtime: `runMinimalSystemLoop(..., { inputIntent })` e `runMinimalSystemLoopWithTrace(..., { inputIntent })`.
- CLI: `run-loop --input-intent <path>`.
- MCP: `run_loop` com `inputIntentPath`.
- sem input intent, `input.keyboard` mantém a semântica atual de `+3` por tick.
- com input intent e `tick` correspondente ao tick executado, `input.keyboard` usa a soma de `actions[].axis.x + actions[].axis.y`, com normalização unsigned no estado final.

## Fora deste slice

- integração com `Scene Document v1`;
- integração com `simulate-state`;
- binding de teclado para input em tempo real.
