# Roadmap

## Meta 1 - V0 Headless completa

Status: concluida.

Entregas consolidadas:

- validacao de scene document por schema + invariantes;
- runtime estavel com loop headless interpretavel;
- InputIntent v1 e KeyboardInputScript v1 opt-in;
- replay deterministico e replay artifact;
- save/load v1 minimo;
- inspect-state, simulate-state e State Mutation Trace v1;
- RenderSnapshot v1 inicial;
- Render SVG v1 inicial;
- CLI e MCP para os fluxos headless principais;
- suites cross-interface e smoke.

Fora de escopo assumido nesta meta:

- canvas interativo;
- Pixi, Three, WebGL;
- editor visual;
- assets reais;
- captura real de teclado;
- multiplayer real;
- ECS completo.

## Meta 2 - Engine visual/interativa minima

Status: concluida.

Entregas consolidadas:

- RenderSnapshot v1 endurecido para cena crua e componentes visuais;
- Render SVG v1;
- SVG Demo HTML v1;
- Canvas2D Demo v1;
- Browser Playable Demo v1;
- Browser Runtime Loop v1 local ao HTML;
- Asset Manifest v1;
- sprite drawCall;
- `visual.sprite`;
- `tile.layer`;
- `camera.viewport`;
- image loading local opcional com fallback;
- CLI/MCP para fluxos visuais principais;
- matriz e checklist de validacao visual.

Fora de escopo assumido nesta meta:

- Pixi, Three, WebGL;
- renderer real do engine;
- editor visual;
- servidor;
- pipeline pesado de assets;
- colisao;
- pathfinding;
- chunk streaming;
- animacao avancada;
- multiplayer real.

## Meta 3 - Runtime visual real e tooling inicial

Objetivo: evoluir da camada visual/interativa minima para um runtime visual real sem quebrar os contratos v1 estabilizados.

Direcoes provaveis:

- backend visual real explicitamente desacoplado do gameplay;
- tooling/editor visual acima de contratos automatizaveis;
- pipeline de assets mais completo;
- validacao visual/performance mais rica;
- gameplay e input alem da demo local autocontida;
- networking alem de contratos e snapshots headless.

## Meta 4 - Maturidade AI-native

Objetivo: acelerar iteracao com garantias mais fortes para agentes.

Direcoes provaveis:

- skills e subagentes adicionais;
- matrizes de regressao mais ricas;
- auditoria automatica de contratos;
- tooling MCP mais profundo por dominio;
- migracoes versionadas e diagnosticos de compatibilidade.
