# Prefab Usage Report v2

Contrato opt-in para expandir o diagnostico de `entity.prefab` com rastreabilidade explicita de paths, origens e overrides, sem mutar o shape de `PrefabUsageReport v1`.

## Escopo do contrato

- preserva `PrefabUsageReport v1` como caminho padrao;
- adiciona `absolutePath` da cena validada;
- adiciona `entityPath` e `prefabAbsolutePath` por entidade prefab-backed;
- adiciona `sourceComponentPath` e `resolvedComponentPath` por componente resolvido;
- adiciona lista `overrides[]` com mapeamento explicito entre componente da entidade, componente do prefab e componente final resolvido.

## Runtime, CLI e MCP

- Runtime: `buildPrefabUsageReportV2(path)`.
- CLI: `inspect-prefab-usage-v2 <scene> [--json]`.
- MCP: `inspect_prefab_usage_v2({ path })`.

## Report

`PrefabUsageReport v2` documenta:

- caminho absoluto da cena validada;
- qual entidade usa qual prefab;
- caminho absoluto do prefab resolvido;
- origem de cada componente (`prefab` ou `entity`);
- path do componente no documento de origem;
- path do componente na entidade resolvida;
- overrides explicitos por `kind`.

Semantica dos paths:

- `entityPath`, `sourceComponentPath` de origem `entity` e `resolvedComponentPath` referenciam o documento de cena;
- `sourceComponentPath` e `prefabComponentPath` de origem `prefab` referenciam o documento `.prefab.json`.

Schema formal: `docs/schemas/prefab-usage-report-v2.schema.json`.

## Compatibilidade

- `inspect-prefab-usage` / `inspect_prefab_usage` continuam retornando `PrefabUsageReport v1`;
- `PrefabUsageReport v2` e opt-in e nao altera `loadSceneFile`, `validateSceneFile`, `RenderSnapshot v1` nem os reports de colisao;
- continua sem nested prefab e sem resolucao automatica para objetos de cena em memoria.

## Fora de escopo

- nested prefabs;
- hierarquia de prefab;
- hot reload;
- editor visual;
- template engine;
- resolver prefabs fora de cargas por path.
