# Input Intent v1

## Objetivo

Definir um contrato isolado para input headless orientado a intenÃ§Ã£o, sem alterar `input.keyboard`, `run-loop`, `simulate-state`, `Scene Document v1` ou contratos de saÃ­da jÃ¡ publicados.

## Shape mÃ­nimo

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
- `tick` Ã© inteiro e comeÃ§a em `1`.
- `entityId` identifica a entidade alvo do intent.
- `actions` preserva a ordem declarada no documento.
- v1 suporta apenas `actions[].type = "move"`.
- `axis.x` e `axis.y` sÃ£o inteiros no intervalo `[-1, 1]`.
- nÃ£o hÃ¡ campos extras nos nÃ­veis controlados do contrato.

## Escopo

- contrato de input headless isolado;
- validaÃ§Ã£o local no runtime;
- validaÃ§Ã£o por CLI e MCP reutilizando o mesmo validador de runtime;
- fixtures mÃ­nimas vÃ¡lidas/invÃ¡lidas.

## Fora deste slice

- integraÃ§Ã£o com `Scene Document v1`;
- integraÃ§Ã£o com `run-loop`;
- integraÃ§Ã£o com `simulate-state`;
- binding de teclado.
