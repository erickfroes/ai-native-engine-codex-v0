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

## Fora deste slice

- captura real de teclado;
- loop interativo real;
- render;
- editor.
