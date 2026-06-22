# Scene Transition Report v1

`SceneTransitionReport v1` e um contrato opt-in para diagnosticar uma troca explicita entre duas cenas validas por path.

Ele fecha o primeiro slice V2 de transicao de cena sem executar troca no loop, sem embutir referencias em `Scene Document v1` e sem reabrir `savegame v1`.

## Interfaces

- Runtime: `buildSceneTransitionReportV1({ fromPath, toPath })`.
- CLI: `inspect-scene-transition <from> <to> [--json]`.
- MCP: `inspect_scene_transition({ fromPath, toPath })`.
- Schema: `docs/schemas/scene-transition-report-v1.schema.json`.

## Shape

```json
{
  "sceneTransitionReportVersion": 1,
  "ok": true,
  "from": {
    "path": "/abs/path/source.scene.json",
    "ok": true,
    "scene": "source",
    "summary": {
      "name": "source",
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
  },
  "to": {
    "path": "/abs/path/target.scene.json",
    "ok": true,
    "scene": "target",
    "summary": {
      "name": "target",
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
  },
  "errors": [],
  "warnings": []
}
```

## Regras

- `fromPath` e `toPath` devem ser strings nao vazias.
- Runtime/CLI/MCP usam `validateSceneFile` para validar cada endpoint com schema, invariantes e resolucao segura de `entity.prefab`.
- `ok` e `true` apenas quando os dois endpoints nao possuem erros.
- Erros e warnings sao preservados em cada endpoint e agregados no root com `endpoint: "from" | "to" | "transition"`.
- Se os dois paths resolvem para o mesmo arquivo, o report permanece valido e emite warning de transicao.

## Compatibilidade

- Nao altera `Scene Document v1`.
- Nao altera `SceneValidationReport v1`, `validate-scene` ou `validate_scene`.
- Nao altera `run-loop`, `LoopReport v1`, `LoopTrace v1` ou scheduler.
- Nao altera `savegame v1`, `State Snapshot v1`, Browser Demo ou exports HTML.
- Nao adiciona system novo nem componente novo neste slice.

## Fora de escopo

- transicao automatica por trigger, colisao, UI ou system;
- carry-over de estado entre cenas;
- spawn target formal;
- save/load cross-scene;
- composition graph, streaming, world partition ou editor-lite.

O manifesto externo de composicao multi-cena foi fechado em `docs/SCENE_COMPOSITION_MANIFEST_V1.md`, e o primeiro diagnostico de grid foi fechado em `docs/PATHFINDING_GRID_V1.md`. O proximo menor passo seguro e `Atlas/Material Manifest v1`, ainda opt-in e sem mutar os contratos v1 existentes.
