# STATUS - Meta 1 / V0 Headless

## Estado atual

A Meta 1 esta concluida como V0 headless, deterministica e orientada a contrato.

O repositorio hoje entrega:

- runtime estavel para cenas pequenas;
- loop headless interpretavel;
- InputIntent v1 opt-in;
- KeyboardInputScript v1 opt-in;
- save/load v1 minimo;
- State Mutation Trace v1 opt-in;
- RenderSnapshot v1;
- Render SVG v1;
- demo HTML estatica derivada de SVG;
- CLI e MCP cobrindo os fluxos headless principais;
- suites cross-interface para contratos criticos.

## O que esta dentro da V0 Headless

- validacao de cena, save e input;
- planejamento e execucao deterministica de loop;
- replay deterministico e replay artifact;
- inspecao e simulacao opt-in de estado;
- persistencia minima de State Snapshot v1;
- render declarativo textual sem backend grafico real.

## O que fica fora de escopo da Meta 1

- canvas, Pixi, Three e WebGL;
- editor visual;
- assets reais como pipeline de producao;
- captura real de teclado;
- multiplayer real;
- ECS completo.

## Superficies canonicas

- CLI: automacao local e exemplos humanos
- MCP: automacao para agentes
- runtime: funcoes e contratos internos versionados

## Validacao obrigatoria

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Sinal para Meta 2

A Meta 2 pode partir desta base para explorar:

- runtime visual real;
- authority/rede alem de contratos headless;
- ampliacao de ECS e gameplay;
- tooling/editor acima da base headless.
