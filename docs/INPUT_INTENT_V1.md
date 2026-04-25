# Input Intent v1

## Objetivo

Definir um contrato isolado para input headless orientado a intencao, sem alterar `input.keyboard`, `run-loop`, `simulate-state`, `Scene Document v1` ou contratos de saida ja publicados.

## Shape minimo

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
- `tick` e inteiro e comeca em `1`.
- `entityId` identifica a entidade alvo do intent.
- `actions` preserva a ordem declarada no documento.
- v1 suporta apenas `actions[].type = "move"`.
- `axis.x` e `axis.y` sao inteiros no intervalo `[-1, 1]`.
- nao ha campos extras nos niveis controlados do contrato.

## Escopo

- contrato de input headless isolado;
- validacao local no runtime;
- validacao por CLI e MCP reutilizando o mesmo validador de runtime;
- fixtures minimas validas e invalidas.

## Convencao minima de teclado

Tradutor headless auxiliar disponivel em:

- runtime: `createInputIntentFromKeyboardV1({ tick, entityId, keys })`
- CLI: `keyboard-to-input-intent --tick <n> --entity <id> --keys <comma-list> [--json]`
- MCP: `keyboard_to_input_intent`

Mapeamento v1:

- `ArrowRight` ou `KeyD` -> `axis: { x: 1, y: 0 }`
- `ArrowLeft` ou `KeyA` -> `axis: { x: -1, y: 0 }`
- `ArrowUp` ou `KeyW` -> `axis: { x: 0, y: -1 }`
- `ArrowDown` ou `KeyS` -> `axis: { x: 0, y: 1 }`
- opostos no mesmo eixo se cancelam
- teclas fora do mapa minimo sao ignoradas
- o tradutor gera uma unica action `move`

## Fora deste slice

- integracao com `Scene Document v1`;
- integracao com `run-loop`;
- integracao com `simulate-state`;
- binding de teclado;
- captura de teclado real em tempo de execucao;
- loop interativo real;
- render ou editor para teclado.
