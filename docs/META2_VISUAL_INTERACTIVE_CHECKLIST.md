# Meta 2 Visual/Interactive Checklist

Checklist de fechamento da Meta 2: engine visual/interativa minima, sem renderer real do engine.

## Pronto na Meta 2

- [x] RenderSnapshot v1 deterministico.
- [x] Render SVG v1 textual.
- [x] SVG Demo HTML v1.
- [x] Canvas2D Demo v1.
- [x] Browser Playable Demo v1.
- [x] Browser Runtime Loop v1 local ao HTML.
- [x] Asset Manifest v1.
- [x] `sprite` drawCall.
- [x] `visual.sprite`.
- [x] `tile.layer`.
- [x] `camera.viewport`.
- [x] image loading local opcional com fallback.
- [x] CLI para `render-snapshot`, `render-svg`, `render-svg-demo`, `render-canvas-demo` e `render-browser-demo`.
- [x] MCP para `render_snapshot`, `render_svg`, `render_canvas_demo` e `render_browser_demo`.
- [x] suites cross-interface para os principais fluxos visuais.
- [x] docs de contratos visuais v1.
- [x] matriz de testes da Meta 2.

## Validacao de pronto

- [x] `npm test`
- [x] `npm run validate:scenes`
- [x] `npm run smoke`

## Limites mantidos

- [x] Sem Pixi.
- [x] Sem Three.
- [x] Sem WebGL.
- [x] Sem editor visual.
- [x] Sem servidor.
- [x] Sem pipeline pesado de assets.
- [x] Sem colisao.
- [x] Sem pathfinding.
- [x] Sem chunk streaming.
- [x] Sem animacao avancada.
- [x] Sem multiplayer real.

## Fica para Meta 3

- [ ] renderer real do engine.
- [ ] tooling/editor visual.
- [ ] pipeline de assets mais completo.
- [ ] regressao visual/performance mais rica.
- [ ] gameplay e input alem da demo local autocontida.
- [ ] camera com zoom, follow, smooth ou efeitos.
- [ ] culling ou streaming de mapas densos.
- [ ] integracao de multiplayer real.

## Nota operacional

A Browser Playable Demo e interativa apenas dentro do HTML gerado. Ela redesenha localmente, captura teclado no canvas e move um alvo visual, mas nao executa systems de gameplay nem substitui o loop headless canonico.
