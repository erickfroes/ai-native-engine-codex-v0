# Prefab System v1

Prefab System v1 inicia o slice de V2 com uma semantica pequena, deterministica e automatizavel para `entity.prefab`.

## Escopo do contrato

- `entity.prefab` aponta para um arquivo `.prefab.json` com caminho relativo seguro a partir do diretorio da cena.
- O arquivo segue `schemas/prefab.schema.json`.
- O runtime resolve prefabs quando recebe **path de cena**. Objetos de cena em memoria continuam sem resolucao automatica de prefab neste slice.
- Cada prefab representa um pacote de componentes para uma unica entidade.

## Merge minimo

- Entidade prefab-backed pode omitir `components` quando nao precisa sobrescrever nada localmente.
- Componentes do prefab entram primeiro.
- Componentes declarados na entidade sobrepoem componentes do prefab com o mesmo `kind`.
- Componentes extras da entidade sao anexados ao final.
- O `id`, `name` e o `prefab` continuam pertencendo a entidade da cena.

## Runtime, CLI e MCP

- Runtime: `buildPrefabValidationReportV1(path)` valida um prefab isoladamente.
- CLI: `validate-prefab <path> [--json]`.
- MCP: `validate_prefab({ path })`.
- Runtime: `loadSceneFile(path)` passa a devolver a cena com prefabs resolvidos.
- Runtime: `buildPrefabUsageReportV1(path)` gera `PrefabUsageReport v1`.
- Runtime: `buildPrefabUsageReportV2(path)` gera `PrefabUsageReport v2` opt-in com rastreabilidade de paths/origins/overrides.
- CLI: `inspect-prefab-usage <scene> [--json]`.
- CLI: `inspect-prefab-usage-v2 <scene> [--json]`.
- MCP: `inspect_prefab_usage({ path })`.
- MCP: `inspect_prefab_usage_v2({ path })`.

## Report

`PrefabUsageReport v1` documenta:

- qual entidade usa qual prefab;
- nome e versao do prefab resolvido;
- origem de cada componente (`prefab` ou `entity`);
- quais componentes do prefab foram sobrescritos pela entidade.

Schema formal: `docs/schemas/prefab-usage-report-v1.schema.json`.

Diagnostico expandido:

- `PrefabUsageReport v2` adiciona `absolutePath`, `entityPath`, `prefabAbsolutePath`, paths de componente e mapeamento explicito de `overrides`.
- Schema formal: `docs/schemas/prefab-usage-report-v2.schema.json`.
- Documentacao dedicada: `docs/PREFAB_USAGE_REPORT_V2.md`.

Validacao direta de arquivo:

- `PrefabValidationReport v1` documenta a validacao isolada do `.prefab.json`.
- Schema formal: `docs/schemas/prefab-validation-report-v1.schema.json`.

## Compatibilidade

- Cenas sem `entity.prefab` permanecem iguais.
- `validateSceneFile`, `render-snapshot`, reports de colisao, Browser Demo e demais fluxos que carregam cena por path passam a consumir a cena resolvida.
- `Game Templates v1` e `V1 Small 2D Game Creation Guide` continuam validos; eles apenas nao dependem deste contrato.

## Fora de escopo

- hierarquia de prefab;
- nested prefabs;
- hot reload;
- editor visual;
- template engine;
- UI system formal;
- migracao de cenas antigas;
- runtime de authoring ou scaffolder automatico.
