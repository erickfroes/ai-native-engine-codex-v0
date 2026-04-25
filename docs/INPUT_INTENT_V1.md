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
- `entityId` identifica a entidade alvo do intent e não pode ser blank.
- `actions` preserva a ordem declarada no documento.
- v1 suporta apenas `actions[].type = "move"`.
- `axis.x` e `axis.y` são inteiros no intervalo `[-1, 1]`.
- o intervalo completo `[-1, 1]` é garantido pelo schema base com validação complementar do runtime neste slice.
- não há campos extras nos níveis raiz, `actions[]` e `axis`.

## Escopo

- contrato de input headless isolado;
- validação local no runtime;
- CLI mínima de validação local;
- fixtures mínimas válidas/inválidas.

## Fora deste slice

- integração com `Scene Document v1`;
- integração com `run-loop`;
- integração com `simulate-state`;
- binding de teclado;
- MCP.
