# Runtime V0

O runtime V0 ainda não renderiza jogo. Nesta fase ele cumpre três papéis:

1. carregar cenas em JSON;
2. validar contratos e invariantes;
3. servir isso para CLI e MCP.

## Entrada principal

- `src/index.mjs`
- `src/cli.mjs`

## Regra da V0

Nenhuma feature nova entra no runtime sem:

- fixture mínima;
- validação correspondente;
- comando local;
- documentação curta.
