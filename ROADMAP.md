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
- RenderSnapshot v1;
- Render SVG v1;
- demo HTML estatica com SVG inline;
- CLI e MCP para os fluxos headless principais;
- suites cross-interface e smoke.

Fora de escopo assumido nesta meta:

- canvas, Pixi, Three, WebGL;
- editor visual;
- assets reais;
- captura real de teclado;
- multiplayer real;
- ECS completo.

## Meta 2 - Runtime visual e ampliacao operacional

Objetivo: sair de uma base puramente headless para uma base visual e operacional mais rica sem perder determinismo.

Direcoes provaveis:

- backend visual minimo e explicitamente desacoplado do gameplay;
- expandir networking alem de contratos e snapshots headless;
- ampliar ECS e sistemas de gameplay;
- adicionar tooling/editor somente depois da base automatizavel permanecer segura.

## Meta 3 - Tooling e editor

Objetivo: produtividade humana sobre a base headless/visual ja estabilizada.

Direcoes provaveis:

- inspector e hierarchy;
- workflows de conteudo;
- validacao orientada a autoring;
- previews e ferramentas de diagnostico.

## Meta 4 - Maturidade AI-native

Objetivo: acelerar iteracao com garantias mais fortes para agentes.

Direcoes provaveis:

- skills e subagentes adicionais;
- matrizes de regressao mais ricas;
- auditoria automatica de contratos;
- tooling MCP mais profundo por dominio.
