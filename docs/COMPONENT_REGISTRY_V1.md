# Component Registry v1

## Objetivo

Definir catálogo interno de componentes conhecidos para o State Model v1, sem relação com o System Registry v1 do loop headless.

## Contrato

- schema formal: `docs/schemas/component-registry-v1.schema.json`.

Shape:

- `componentRegistryVersion: 1`
- `components[]` com metadados estáveis (`name`, `version`, `deterministic`, `description`).

Componentes conhecidos iniciais:

- `transform` v1
- `velocity` v1
- `visual.sprite` v1
- `tile.layer` v1
- `camera.viewport` v1
- `collision.bounds` v1

## Separação de responsabilidade

- `System Registry v1`: systems do loop headless legado.
- `Component Registry v1`: componentes conhecidos para processamento de estado opt-in.
