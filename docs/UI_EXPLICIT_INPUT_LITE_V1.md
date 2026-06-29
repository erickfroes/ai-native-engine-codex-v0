# UI Explicit Input Lite v1

UI Explicit Input Lite v1 separa a entrada local de UI (`navigate`/`activate`) do `InputIntent v1` de gameplay.

O objetivo deste slice e pequeno:

- declarar um payload externo, versionado e validavel para um unico passo de UI;
- cobrir `navigate` sequencial e `activate` explicito;
- expor runtime, CLI e MCP alinhados;
- preservar `InputIntent v1`, `UiInputStepReport v1`, loop, replay, save/load, Browser Demo e exports sem mutacao funcional.

Este pacote nao adiciona componente de cena.

## Payload

Schema formal: `docs/schemas/ui-explicit-input-v1.schema.json`.

Navegacao:

```json
{
  "uiExplicitInputVersion": 1,
  "tick": 1,
  "action": {
    "type": "navigate",
    "direction": "next"
  }
}
```

Ativacao:

```json
{
  "uiExplicitInputVersion": 1,
  "tick": 2,
  "action": {
    "type": "activate"
  }
}
```

## Regras

- `uiExplicitInputVersion` deve ser exatamente `1`.
- `tick` e inteiro e comeca em `1`.
- `action.type` pode ser `navigate` ou `activate`.
- `navigate` exige `direction: "previous" | "next"`.
- `activate` nao aceita `direction`.
- v1 aceita uma unica `action`; batching/chording fica fora deste contrato.
- o payload nao tem `entityId`, `screenId`, `widgetId` ou `actionId`; a scope vem de `UiLocalScreenStateReport v1`.

## CLI

```bash
node ./engine/runtime/src/cli.mjs validate-ui-explicit-input ./fixtures/ui-input/navigate-next.ui-explicit-input.json --json
node ./engine/runtime/src/cli.mjs keyboard-to-ui-explicit-input --tick 1 --keys ArrowRight --json
```

Mapeamento minimo de teclado:

- `ArrowRight`, `ArrowDown`, `KeyD`, `KeyS` -> `navigate next`
- `ArrowLeft`, `ArrowUp`, `KeyA`, `KeyW` -> `navigate previous`
- `Enter`, `NumpadEnter`, `Space` -> `activate`

Combinar navegacao e ativacao no mesmo payload falha de forma previsivel.

## MCP

Tools:

- `validate_ui_explicit_input({ path })`
- `keyboard_to_ui_explicit_input({ tick, keys })`

## Fixtures

- `fixtures/ui-input/navigate-next.ui-explicit-input.json`
- `fixtures/ui-input/navigate-previous.ui-explicit-input.json`
- `fixtures/ui-input/activate.ui-explicit-input.json`
- fixtures invalidas em `fixtures/ui-input/invalid.*.ui-explicit-input.json`

## Compatibilidade

- `InputIntent v1` permanece contrato de gameplay/movimento.
- `move == 0` em `UiInputStepReport v1` continua compatibilidade local desse report legado, nao semantica canonica de ativacao de UI.
- Browser Demo, Simple HTML Export e Portable HTML Export continuam passivos para UI input.

## Fora de Escopo

- consumo interativo no Browser Demo/export;
- mouse/touch/hit-testing/click;
- estado de UI persistido em savegame;
- novo componente de cena;
- ordem espacial de foco;
- multiplas actions por payload.
