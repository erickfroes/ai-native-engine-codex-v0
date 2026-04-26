# Handoff para Codex - Meta 2 Visual/Interativa

Este repositorio esta pronto para handoff como Meta 2 visual/interativa minima.

## O que o Codex recebe

- contratos v1 documentados;
- runtime, CLI e MCP alinhados nos fluxos headless e visuais principais;
- suites cross-interface para os contratos sensiveis;
- fixtures pequenas e reproduziveis;
- Browser Playable Demo autocontida com input local;
- baseline de validacao claro antes de qualquer mudanca.

## O que conferir antes de editar

```bash
git status -sb
npm test
npm run validate:scenes
npm run smoke
```

## Sequencia recomendada dentro do Codex

1. Ler `README.md`, `AGENTS.md`, `docs/module-contracts.md` e este arquivo.
2. Confirmar baseline verde com `npm test`, `npm run validate:scenes` e `npm run smoke`.
3. Validar a cena tutorial por CLI e MCP.
4. Exercitar `render-snapshot` / `render_snapshot`.
5. Exercitar `render-svg` / `render_svg`.
6. Exercitar `render-canvas-demo` / `render_canvas_demo`.
7. Exercitar `render-browser-demo` / `render_browser_demo`.
8. Conferir fixtures de `visual.sprite`, `tile.layer` e `camera.viewport`.
9. Ampliar somente com contrato, fixture, validacao, CLI/MCP quando fizer sentido, docs e testes.

## Escopo entregue na Meta 2

- base headless deterministica herdada da Meta 1;
- RenderSnapshot v1;
- Render SVG v1;
- SVG Demo HTML v1;
- Canvas2D Demo v1;
- Browser Playable Demo v1;
- Browser Runtime Loop v1 local ao HTML;
- Asset Manifest v1;
- sprite drawCall;
- `visual.sprite`;
- `tile.layer`;
- `camera.viewport`.

## Fora de escopo que deve permanecer explicito

- Pixi, Three, WebGL e renderer real do engine;
- editor visual;
- servidor;
- pipeline pesado de assets;
- colisao, pathfinding e chunk streaming;
- animacao avancada;
- multiplayer real;
- loop/gameplay completo dentro do browser.

## Regra pratica de continuidade

Se houver duvida sobre comportamento, preserve os contratos v1 atuais e adicione teste/fixture antes de ampliar escopo. A Browser Playable Demo e uma demo local autocontida; ela nao substitui o loop headless canonico do engine.
