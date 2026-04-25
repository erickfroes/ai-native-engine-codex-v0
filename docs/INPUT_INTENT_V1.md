# Input Intent v1

## Objetivo

Definir um contrato isolado para input headless orientado a intenção, sem alterar `input.keyboard`, `run-loop`, `simulate-state`, `Scene Document v1` ou contratos de saída já publicados.

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
- validação por CLI e MCP reutilizando o mesmo validador de runtime;
- fixtures mínimas válidas/inválidas.

## Fora deste slice

- integração com `Scene Document v1`;
- integração com `run-loop`;
- integração com `simulate-state`;
- binding de teclado.
