# Scene Document v1

## Objetivo

Definir formalmente o formato atual de entrada de cena aceito pelo engine (documento de cena), sem alterar execução nem contratos de saída.

## Campos atualmente aceitos

Shape base (v1):

- `version` (integer >= 1)
- `metadata` (object, com `name`)
- `systems` (array de string, não vazio)
- `entities` (array de entidades)
- `assetRefs` (array de string, opcional)

## Declaração de systems

- `systems` é um array de nomes de system em ordem declarada na cena.
- Essa ordem declarada é a base da ordem real por tick no `Loop Scheduler v1`.

## Relações com outros contratos

- `System Registry v1`: define quais systems são conhecidos e seus metadados (`delta`, `deterministic`).
- `SceneValidationReport v1`: resultado da validação do Scene Document (não é o formato do documento de entrada).
- `ExecutionPlan v1`: planejamento da execução com base no documento validado.
- `Loop Scheduler v1`: define ordem real por tick a partir da ordem declarada em `systems`.

## System desconhecido

- Um scene document com system desconhecido ainda é um documento parseável.
- A validação semântica (`validateLoopScene`) marca como inválido via `SCENE_SYSTEM_UNKNOWN`.

## Documento vs relatório de validação

- `Scene Document v1` = contrato de **input**.
- `SceneValidationReport v1` = contrato de **resultado da validação**.

