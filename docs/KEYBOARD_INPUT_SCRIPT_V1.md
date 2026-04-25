# Keyboard Input Script v1

## Objetivo

Definir um contrato headless e deterministico para declarar teclas por tick, sem captura real de teclado e sem acoplamento com render ou editor.

## Shape minimo

```json
{
  "keyboardInputScriptVersion": 1,
  "entityId": "player",
  "ticks": [
    { "tick": 1, "keys": ["ArrowRight"] },
    { "tick": 2, "keys": ["ArrowRight", "ArrowUp"] }
  ]
}
```

## Regras v1

- `keyboardInputScriptVersion` deve ser exatamente `1`.
- `entityId` deve ser string nao vazia.
- `ticks` deve ser array nao vazio.
- cada item de `ticks` deve declarar `tick` inteiro >= `1`.
- cada item de `ticks` deve declarar `keys` como array nao vazio de strings.
- `ticks[].tick` deve ser unico dentro do script.
- campos extras nao sao permitidos nos niveis controlados do contrato.

## Escopo

- contrato serializavel para input de teclado por tick;
- validacao local no runtime;
- geracao posterior de `InputIntent v1` por tick a partir desse contrato.

## Integracao minima

- runtime: `runLoopWithKeyboardInputScriptV1(scenePath, scriptPath, { ticks, seed })`
- CLI: `run-loop <scene> --ticks <n> --keyboard-script <path> [--seed <n>] [--json] [--trace]`
- MCP: `run_loop` com `keyboardScriptPath`

## Comportamento

- sem script, `run-loop` e `run_loop` mantem exatamente o comportamento padrao atual;
- com script, cada tick declarado gera um `InputIntent v1` via `createInputIntentFromKeyboardV1`;
- ticks omitidos no script mantem a semantica padrao de `input.keyboard`;
- o fluxo continua headless e deterministico;
- nao ha captura real de teclado do sistema.

## Fora deste slice

- captura real de teclado;
- loop interativo real;
- render;
- editor.
