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

- `engine/runtime/src/prefab/`:
  - validar prefabs por schema formal;
  - produzir relatório serializável para CLI.

- `engine/runtime/src/assets/`:
  - validar manifesto de assets por schema formal;
  - validar `assetRefs` da cena contra manifesto explícito.

- `engine/runtime/src/systems/`:
  - executar o primeiro loop determinístico da V0;
  - aplicar atualização reproduzível por tick (base para evolução de gameplay);
  - gerar replay determinístico mínimo (`replay-first-loop.mjs`) para inspeção automatizada por frame/tick.
  - capturar e reproduzir artifact de replay (`replay-artifact.mjs`) para validação de playback.
  - verificar estabilidade de replay em múltiplas execuções (`verify-replay-determinism.mjs`).
  - publicar métricas de execução do loop inicial (`benchmark-first-loop.mjs`) para CI/automação.

- `engine/runtime/src/ecs/`:
  - construir world serializável a partir da cena;
  - produzir resumo ECS para inspeção por CLI e MCP (com filtros opcionais por `componentKind` e `systemName`);
  - produzir hierarquia serializável de cena baseada em `entity.id` para inspeção determinística (`scene-hierarchy.mjs`, com filtros opcionais por `componentKind` e `systemName`).

- `engine/runtime/src/save/`:
  - validar savegame por schema formal;
  - produzir relatório serializável para CLI e MCP.

- `engine/runtime/src/input/`:
  - validar input bindings por schema formal;
  - produzir relatório serializável para CLI e MCP.

- `engine/runtime/src/ui/`:
  - validar layout de UI por schema formal;
  - produzir relatório serializável para CLI e MCP.

- `engine/runtime/src/render/`:
  - validar perfil de pipeline de render por schema formal;
  - produzir relatório serializável para CLI e MCP;
  - impacto de performance V0: validação ocorre offline (CLI/MCP), sem custo no loop de frame do runtime.

- `engine/runtime/src/network/`:
  - validar mensagens de rede versionadas por schema formal (`net_message.schema.json`);
  - aplicar contrato V1 explícito para `world.snapshot` (direção `server_to_client`, `reliability` = `reliable`, `payload.tick` inteiro >= 0 e `payload.entities[].id` único);
  - comparar snapshots de rede em pares para inspeção de delta estrutural (entidades adicionadas/removidas/alteradas);
  - validar consistência de sequência de snapshots com escopo explícito de opcode (`world.snapshot`), além de version/direction/reliability e tick estritamente crescente;
  - simular stream ordenado de snapshots `world.snapshot` para inspeção de timeline de replicação do cliente;
  - produzir relatórios serializáveis para CLI e MCP;
  - impacto de performance V0/Fase 2 inicial: validação/diff offline (CLI/MCP), sem impacto no tick loop.

- `engine/runtime/src/scene/load-scene.mjs`:
  - resolver `entity.prefab` em load-time;
  - falhar explicitamente com `PrefabValidationError` quando referência de prefab for inválida.

- `tools/mcp-server/src/`:
  - adaptar o runtime para o protocolo MCP via stdio.

## Contratos importantes

### Cena válida

Uma cena válida precisa satisfazer:

1. `schemas/scene.schema.json`
2. `schemas/component.schema.json`
3. invariantes adicionais do runtime

### Prefab válido

Um prefab válido precisa satisfazer:

1. `schemas/prefab.schema.json`
2. `schemas/component.schema.json`

### Manifesto de assets válido

Um manifesto válido precisa satisfazer:

1. `schemas/asset_manifest.schema.json`

### Invariantes adicionais da V0

- `entity.id` é único;
- `components` não pode ser vazio, exceto quando a entidade declara `prefab` válido para resolução no load;
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
