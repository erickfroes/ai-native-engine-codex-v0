# Contratos de módulo

## Runtime V0

A V0 tem um único objetivo operacional: transformar contrato de cena em algo carregável, validável e acionável via MCP.

### Responsabilidades atuais

- `engine/runtime/src/schema/`:
  - carregar schemas do repositório;
  - validar dados com um subconjunto previsível de JSON Schema.

- `engine/runtime/src/scene/`:
  - carregar cenas JSON;
  - validar shape e invariantes;
  - produzir resumo serializável.

- `engine/runtime/src/cli.mjs`:
  - expor comandos para humanos e para automação.

- `tools/mcp-server/src/`:
  - adaptar o runtime para o protocolo MCP via stdio.

## Contratos importantes

### Cena válida

Uma cena válida precisa satisfazer:

1. `schemas/scene.schema.json`
2. `schemas/component.schema.json`
3. invariantes adicionais do runtime

### Invariantes adicionais da V0

- `entity.id` é único;
- `components` não pode ser vazio;
- `component.kind` é único por entidade;
- se existir componente replicado, `networking.replication` deve estar em `systems`.

## Regra de evolução

Ao adicionar novo comportamento, preserve esta sequência:

1. contrato;
2. fixture;
3. validação;
4. CLI;
5. tool MCP;
6. documentação curta.
