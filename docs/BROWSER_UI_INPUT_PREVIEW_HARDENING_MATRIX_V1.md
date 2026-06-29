# Browser UI Input Preview Hardening Matrix v1

Browser UI Input Preview Hardening Matrix v1 fecha o hardening do preview local de input UI na Browser Demo sem ampliar o contrato para exports, loop, replay, savegame ou `RenderSnapshot v1`.

O objetivo deste slice e consolidar evidencias do que ja estava entregue em `Browser UI Input Preview v1`:

- preview continua opt-in e restrito a `render-browser-demo --ui-system --ui-input-preview`;
- Browser Demo com `--ui-system` continua passiva quando o preview esta desligado;
- `export-html-game` e `export-portable-html-game` continuam superficies passivas;
- runtime, CLI e MCP permanecem alinhados para preview on/off e para erros previsiveis.

## Escopo coberto

| Caso | Superficie principal | Evidencia |
| --- | --- | --- |
| preview off sem sideband/status/helper JS | Browser Demo runtime | `engine/runtime/test/browser-playable-demo-runtime.test.mjs` |
| preview on com sideband/status/helper JS | Browser Demo runtime | `engine/runtime/test/browser-playable-demo-runtime.test.mjs` |
| paridade runtime/CLI/MCP de preview off/on | Browser Demo cross-interface | `engine/runtime/test/browser-playable-demo-cross-interface.integration.test.mjs` |
| erro previsivel sem `uiSystem` | runtime/CLI/MCP | `engine/runtime/test/browser-playable-demo-cross-interface.integration.test.mjs`, `engine/runtime/test/cli-render-browser-demo.test.mjs`, `tools/mcp-server/test/mcp-server.test.mjs` |
| export simples passivo em `ui-action-semantics` | runtime/CLI/MCP | `engine/runtime/test/simple-html-export-v1.test.mjs` |
| export portatil passivo em `ui-action-semantics` | runtime/CLI/MCP | `engine/runtime/test/portable-html-export-v2.test.mjs` |
| rejeicao explicita de `--ui-input-preview` nos exports CLI | CLI | `engine/runtime/test/simple-html-export-v1.test.mjs`, `engine/runtime/test/portable-html-export-v2.test.mjs` |

## Guardrails consolidados

- `uiInputPreview` exige `uiSystem` em runtime, CLI e MCP.
- O unico listener de teclado continua no `canvas`.
- O overlay `uiSystem` permanece passivo com `pointer-events: none`.
- Browser Demo com `--ui-system` e sem preview nao embute `browserUiInputPreview`, status DOM nem helper JS do preview.
- `export-html-game` e `export-portable-html-game` nao embutem `browserUiInputPreview`, status DOM, helper JS ou atributos `data-ui-preview-*`.
- Os exports CLI agora falham de forma previsivel se `--ui-input-preview` for passado fora de `render-browser-demo`.

## Budget

- O delta de HTML do preview sobre `--ui-system` permanece preso a `<= 3 * 1024` bytes no runtime.
- A medicao de referencia atual fica abaixo do teto e continua guardada por teste dedicado no Browser Demo runtime.
- Os exports mantem apenas o gate proprio de `uiSystem` e nao passam a carregar budget de preview porque o preview continua fora dessas superficies.

## Validacao

```bash
node --test engine/runtime/test/browser-playable-demo-cross-interface.integration.test.mjs engine/runtime/test/simple-html-export-v1.test.mjs engine/runtime/test/portable-html-export-v2.test.mjs
npm test
npm run validate:scenes
npm run smoke
```

## Fora de escopo

- consumo interativo em `export-html-game` ou `export-portable-html-game`;
- promover `move == 0` de `InputIntent v1` a semantica canonica de UI;
- mouse, touch, hit-testing e click;
- savegame canonico de UI;
- novo componente de cena para input ou estado local de UI;
- editor-lite, particle-lite, route solving ou 3D.

## Continuidade

Com esta matriz fechada, o menor proximo passo seguro passa a ser **Audio v1 de jogo pequeno**: evoluir `Audio Lite v1` com bancos/clips/eventos pequenos, feedback de menu/gameplay e garantia de Browser Demo/export sem dependencia externa surpresa.
