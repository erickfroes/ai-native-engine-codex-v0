# Visual Regression Baseline v1

## Objetivo

Definir um report headless, deterministico e opt-in para detectar regressao visual estrutural sem browser, screenshot ou pixel-diff obrigatorio.

O report deriva de `RenderSnapshot v1` e `Render SVG v1`; ele nao altera nenhum desses contratos.

## Shape minimo

```json
{
  "visualRegressionBaselineReportVersion": 1,
  "scene": "v1-small-2d",
  "tick": 0,
  "viewport": {
    "width": 32,
    "height": 24
  },
  "renderSnapshotVersion": 1,
  "svgVersion": 1,
  "hashAlgorithm": "sha256",
  "snapshotHash": "e3981b0f8c68a2ad1a4e9b7fda67750794b462a84b7f24687abfbcb6b1d99ce0",
  "svgHash": "296a7e3ab6c2f3a56a4c4727d95ed804214622bab672d706d0c9db4db57dc3ef",
  "drawCallCount": 23,
  "drawCallsByKind": {
    "rect": 23,
    "sprite": 0
  },
  "layers": [
    {
      "layer": -10,
      "count": 20
    }
  ],
  "uniqueSpriteAssetIds": []
}
```

## Regras v1

- `visualRegressionBaselineReportVersion` deve ser exatamente `1`.
- `scene`, `tick` e `viewport` sao copiados do `RenderSnapshot v1` gerado.
- `renderSnapshotVersion` deve ser `1`.
- `svgVersion` deve ser `1`.
- `hashAlgorithm` deve ser `sha256`.
- `snapshotHash` usa `sha256Hex(renderSnapshot)` com JSON canonico.
- `svgHash` usa `sha256Hex(svg)` sobre a string exata de `renderSnapshotToSvgV1`.
- `drawCallCount` conta `renderSnapshot.drawCalls`.
- `drawCallsByKind` agrega chamadas `rect` e `sprite`.
- `layers` agrega contagem por `layer` em ordem crescente.
- `uniqueSpriteAssetIds` lista asset ids de draw calls `sprite` em ordem alfabetica.
- campos extras nao sao permitidos nos niveis controlados do contrato.

## Runtime, CLI e MCP

- Runtime: `buildVisualRegressionBaselineReportV1(scenePathOuScene, options)`.
- CLI: `inspect-visual-regression-baseline <scene> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--json]`.
- MCP: `inspect_visual_regression_baseline({ path, tick?, width?, height?, assetManifestPath? })`.
- Schema formal: `docs/schemas/visual-regression-baseline-report-v1.schema.json`.

As opcoes seguem o mesmo significado de `RenderSnapshot v1`. `assetManifestPath` continua opt-in e local.

## Compatibilidade

- nao altera `RenderSnapshot v1`;
- nao altera `Render SVG v1`;
- nao altera Browser Demo, Canvas2D Demo ou exports HTML;
- nao altera `SceneValidationReport v1`;
- nao adiciona screenshot, rasterizacao real ou pixel-diff obrigatorio;
- nao reabre `entity.prefab` v1.

## Fora deste slice

- `--accept` automatico de baseline;
- arquivo de baseline canônico gerado por CLI;
- captura de tela;
- comparacao PNG/pixel-diff;
- browser, canvas real, Pixi, Three, WebGL ou WebGPU;
- atlas/material manifest;
- editor visual.
