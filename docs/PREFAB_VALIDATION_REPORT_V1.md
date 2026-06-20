# Prefab Validation Report v1

Contrato minimo para validar um arquivo `.prefab.json` diretamente, sem depender de uma cena que o referencie.

## Escopo do contrato

- valida `schemas/prefab.schema.json`;
- aplica invariantes locais do prefab, como unicidade de `component.kind`;
- retorna um report deterministico para caminho feliz e falhas previsiveis;
- nao resolve `entity.prefab`, nao faz merge com entidades e nao exige `Scene Document v1`.

## Runtime, CLI e MCP

- Runtime: `buildPrefabValidationReportV1(path)`.
- CLI: `validate-prefab <path> [--json]`.
- MCP: `validate_prefab({ path })`.

## Report

`PrefabValidationReport v1` documenta:

- caminho absoluto validado;
- status `ok`;
- documento `prefab` parseado quando disponivel;
- lista deterministica de `errors`.

Quando o arquivo nao existe ou o JSON e malformado, `prefab` retorna `null`.

Schema formal: `docs/schemas/prefab-validation-report-v1.schema.json`.

## Compatibilidade

- nao altera `Prefab System v1`;
- nao altera `loadSceneFile`, `validateSceneFile`, `RenderSnapshot v1` ou reports de colisao;
- reaproveita a mesma validacao de arquivo usada internamente pela resolucao de prefabs por path.

## Fora de escopo

- nested prefabs;
- hierarquia de prefab;
- hot reload;
- editor visual;
- template engine;
- runtime de authoring.
