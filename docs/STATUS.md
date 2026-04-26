# STATUS - Meta 2 Visual/Interativa

## Estado atual

A Meta 2 esta concluida como camada visual/interativa minima sobre a base headless deterministica da Meta 1.

O repositorio hoje entrega:

- validacao de cena, save e input;
- loop headless interpretavel;
- replay e replay artifact deterministico;
- save/load v1 minimo;
- State Mutation Trace v1 opt-in;
- RenderSnapshot v1;
- Render SVG v1;
- SVG Demo HTML v1;
- Canvas2D Demo v1;
- Browser Playable Demo v1;
- Browser Runtime Loop v1 local ao HTML;
- Asset Manifest v1;
- drawCall `sprite`;
- `visual.sprite`;
- `tile.layer`;
- `camera.viewport`;
- image loading local opcional com fallback;
- CLI e MCP para os principais fluxos visuais;
- suites cross-interface para contratos criticos.

## O que esta dentro da Meta 2

- render declarativo por `RenderSnapshot v1`;
- serializacao textual por `Render SVG v1`;
- demos HTML autocontidas por SVG, Canvas2D e Browser Playable Demo;
- componentes visuais declarativos pequenos;
- camera declarativa minima via offset de drawCalls;
- carregamento local de imagem apenas na Browser Playable Demo, com fallback deterministico;
- validacao automatica por runtime, CLI, MCP e testes cross-interface.

## O que fica fora de escopo da Meta 2

- Pixi;
- Three;
- WebGL;
- renderer real do engine;
- editor visual;
- servidor;
- pipeline pesado de assets;
- colisao;
- pathfinding;
- chunk streaming;
- animacao avancada;
- multiplayer real;
- gameplay em tempo real no browser.

## Superficies canonicas

- runtime: funcoes e contratos internos versionados;
- CLI: automacao local e exemplos humanos;
- MCP: automacao para agentes;
- docs: contratos curtos e limites de escopo.

## Validacao obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Sinal para Meta 3

A Meta 3 pode partir desta base para explorar:

- renderer real do engine sem quebrar contratos v1;
- editor/tooling visual sobre os contratos existentes;
- assets pipeline mais completo;
- gameplay e interacao alem da Browser Playable Demo local;
- auditoria visual/performance mais rica.
