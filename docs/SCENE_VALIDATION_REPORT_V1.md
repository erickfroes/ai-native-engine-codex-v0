# SceneValidationReport v1

## Objetivo

Padronizar a validação de cena antes da execução do loop headless com um relatório estruturado comum para runtime, CLI, MCP, testes e agentes.

## Shape

```json
{
  "sceneValidationReportVersion": 1,
  "scene": "string",
  "valid": true,
  "errors": [],
  "warnings": [],
  "systems": [
    {
      "name": "core.loop",
      "known": true,
      "delta": 1,
      "deterministic": true
    }
  ]
}
```

Schema formal: `docs/schemas/scene-validation-report-v1.schema.json`.

## Códigos estáveis (mínimos)

- `SCENE_FILE_NOT_FOUND`
- `SCENE_JSON_MALFORMED`
- `SCENE_SYSTEMS_MISSING`
- `SCENE_SYSTEMS_EMPTY`
- `SCENE_SYSTEM_UNKNOWN`
- `SCENE_SYSTEM_NAME_INVALID`

## Regras de systems no relatório

- systems conhecidos vêm do `System Registry v1` (`docs/SYSTEM_REGISTRY_V1.md`);
- para system conhecido: `known=true`, inclui `delta` e `deterministic`;
- para system desconhecido: `known=false`, sem `delta` e sem `deterministic`.

## Separação de responsabilidades

- `SceneValidationReport v1`: valida pré-execução da cena;
- `LoopReport v1`: resultado da execução do loop;
- `LoopTrace v1`: diagnóstico opt-in por tick/system;
- `System Registry v1`: fonte de verdade de systems conhecidos.

