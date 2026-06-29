# Audio Event Bank Test Matrix v1

Audio Event Bank Manifest v1 abre a trilha de `Audio v1 de jogo pequeno` como contrato report-only acima de `Audio Lite v1`. Esta matriz cobre manifesto, report, cena publica e paridade runtime/CLI/MCP.

## Coverage

| Area | Command/Test | Coverage |
| --- | --- | --- |
| Runtime report | `engine/runtime/test/audio-event-bank-runtime.test.mjs` | manifesto valido, missing clip, manifesto ausente, ordenacao deterministica |
| CLI report | `engine/runtime/test/cli-inspect-audio-event-bank.test.mjs` | `inspect-audio-event-bank <manifest> --json`, saida legivel, exit code previsivel para manifesto invalido |
| Cross-interface | `engine/runtime/test/audio-event-bank-cross-interface.integration.test.mjs` | runtime = CLI = MCP, manifesto invalido, tool catalog MCP, argumentos invalidos |
| Cena publica | `npm run validate:scenes`, `validate-scene ./scenes/audio-game-feedback.scene.json --json` | cena publica pequena em `scenes/` continua valida |

## Validation Commands

```bash
node --test ./engine/runtime/test/audio-event-bank-runtime.test.mjs
node --test ./engine/runtime/test/cli-inspect-audio-event-bank.test.mjs
node --test ./engine/runtime/test/audio-event-bank-cross-interface.integration.test.mjs
npm run validate:scenes
```

## Notes

- O manifesto e report-only: Browser Demo/export ainda nao consomem `AudioEventBankReport v1` neste slice.
- `audio.clip` e `AudioLiteReport v1` permanecem congelados como base diagnostica.
- `sceneAudio.warnings` e `sceneAudio.invalidRefs` continuam vindo de `Audio Lite v1`, para evitar drift entre a trilha antiga de clips e a nova trilha de bancos/eventos.
