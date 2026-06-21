# Asset Manifest Validation Report v1

Contrato minimo para validar um arquivo `Asset Manifest v1` diretamente, sem depender de `RenderSnapshot v1`, Browser Demo ou outros consumidores visuais.

## Escopo do contrato

- valida `docs/schemas/asset-manifest-v1.schema.json`;
- aplica invariantes locais ja usados pelo manifesto, como `assets[].id` unico e `src` contido no diretorio do manifesto;
- retorna um report deterministico para caminho feliz, manifesto parseavel invalido, arquivo ausente e JSON malformado;
- nao importa bytes, nao embute assets e nao cria pipeline de authoring.

## Runtime, CLI e MCP

- Runtime: `buildAssetManifestValidationReportV1(path)`.
- CLI: `validate-asset-manifest <path> [--json]`.
- MCP: `validate_asset_manifest({ path })`.

## Report

`AssetManifestValidationReport v1` documenta:

- caminho absoluto validado;
- status `ok`;
- documento `assetManifest` parseado quando disponivel;
- lista deterministica de `errors`.

Quando o arquivo nao existe ou o JSON e malformado, `assetManifest` retorna `null`.

Schema formal: `docs/schemas/asset-manifest-validation-report-v1.schema.json`.

## Compatibilidade

- nao altera `Asset Manifest v1`;
- nao altera `RenderSnapshot v1`, Browser Demo, Canvas2D Demo, `Simple HTML Export v1` ou `Portable HTML Export v2`;
- reaproveita a mesma validacao de manifesto ja usada pelos consumidores visuais quando o JSON e parseavel;
- isola erros de arquivo ausente/JSON malformado em mensagens estaveis para runtime, CLI e MCP.

## Fora de escopo

- bundling de assets;
- importacao ou transformacao de imagens;
- atlas, materiais, animacao ou editor de assets;
- qualquer mutacao de `RenderSnapshot v1`.
