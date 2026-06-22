# Scene Composition Manifest v1

`Scene Composition Manifest v1` e um contrato externo, opt-in e report-only para declarar um conjunto pequeno de cenas relacionadas por refs estaveis.

Ele fecha o slice minimo de composicao multi-cena sem embutir referencias em `Scene Document v1`, sem executar navegacao no loop e sem reabrir `SceneValidationReport v1` ou `savegame v1`.

## Interfaces

- Runtime: `buildSceneCompositionManifestReportV1(path)`.
- CLI: `inspect-scene-composition <path> [--json]`.
- MCP: `inspect_scene_composition({ path })`.
- Schema do manifesto: `docs/schemas/scene-composition-manifest-v1.schema.json`.
- Schema do report: `docs/schemas/scene-composition-manifest-report-v1.schema.json`.

## Manifesto

```json
{
  "sceneCompositionManifestVersion": 1,
  "metadata": {
    "name": "three-scene-composition"
  },
  "entryScene": "boot",
  "scenes": [
    { "ref": "boot", "path": "./boot.scene.json" },
    { "ref": "town", "path": "./town.scene.json" },
    { "ref": "battle", "path": "./battle.scene.json" }
  ]
}
```

## Report

```json
{
  "sceneCompositionManifestReportVersion": 1,
  "ok": true,
  "absolutePath": "/abs/path/three-scene-composition.manifest.json",
  "manifest": {
    "sceneCompositionManifestVersion": 1,
    "metadata": { "name": "three-scene-composition" },
    "entryScene": "boot",
    "scenes": [
      { "ref": "boot", "path": "./boot.scene.json" }
    ]
  },
  "entryScene": "boot",
  "entryScenePath": "/abs/path/boot.scene.json",
  "scenes": [
    {
      "ref": "boot",
      "path": "/abs/path/boot.scene.json",
      "ok": true,
      "scene": "composition-boot",
      "summary": {
        "name": "composition-boot",
        "entityCount": 1,
        "componentCount": 1,
        "replicatedComponentCount": 0,
        "systemCount": 1,
        "assetRefCount": 0,
        "systems": ["core.loop"],
        "assetRefs": []
      },
      "errors": [],
      "warnings": []
    }
  ],
  "errors": [],
  "warnings": []
}
```

## Regras

- `entryScene` referencia um `scenes[].ref`, nao um path.
- `scenes[].ref` deve ser string nao vazia e unica no manifesto.
- `scenes[].path` deve ser relativo seguro ao diretorio do manifesto.
- Paths com URL, traversal, absoluto, UNC ou extensao diferente de `.scene.json` falham no report.
- Dois refs nao podem resolver para o mesmo path normalizado dentro do manifesto.
- Cada cena referenciada passa por `validateSceneFile`, cobrindo schema, invariantes e resolucao segura de `entity.prefab`.
- `ok` so e verdadeiro quando o manifesto e todas as cenas referenciadas nao possuem erros.
- Arquivo ausente e JSON malformado retornam report invalido com `manifest: null`.

## Compatibilidade

- Nao altera `Scene Document v1`.
- Nao altera `SceneValidationReport v1`, `validate-scene`, `validate_scene` ou `validate-all-scenes`.
- Nao altera `SceneTransitionReport v1`.
- Nao altera `run-loop`, scheduler, render, Browser Demo, exports HTML ou `savegame v1`.
- Nao adiciona system novo, componente novo, graph de transicao, trigger automatico ou carry-over de estado.

## Fora de escopo

- navegacao runtime entre cenas;
- portal, trigger, menu flow ou UI de selecao;
- estado persistente cross-scene;
- nested manifests, auto-discovery por pasta ou glob;
- streaming, world partition, editor-lite ou server.

O proximo menor passo seguro e `Pathfinding Grid v1`, derivado de `tile.layer` e `collision.bounds`, em superficie opt-in nova e sem acoplar editor ou pipeline pesado de assets.
