# Contratos de módulo

## Runtime V0

A V0 tem um único objetivo operacional: transformar contrato de cena em algo carregável, validável e acionável via MCP.

### Responsabilidades atuais

- `engine/runtime/src/schema/`:
  - carregar schemas do repositório;
  - validar dados com um subconjunto previsível de JSON Schema.

- `engine/runtime/src/scene/`:
  - carregar cenas JSON;
  - validar shape e invariantes;
  - produzir resumo serializável.

- `engine/runtime/src/network/`:
  - gerar `world.snapshot` mínimo a partir de componentes replicados;
  - validar a mensagem contra `schemas/net_message.schema.json`.

- `engine/runtime/src/replay/`:
  - executar replay determinístico mínimo por ticks na ordem dos systems da cena;
  - retornar snapshot final para comparação reproduzível;
  - gerar `replaySignature` estável a partir de serialização canônica.
  - expor payload CI mínimo alinhado entre CLI e MCP.

- `engine/runtime/src/cli.mjs`:
  - expor comandos para humanos e para automação.

- `tools/mcp-server/src/`:
  - adaptar o runtime para o protocolo MCP via stdio.

## Contratos importantes

### Cena válida

Uma cena válida precisa satisfazer:

1. `schemas/scene.schema.json`
2. `schemas/component.schema.json`
3. invariantes adicionais do runtime

### Invariantes adicionais da V0

- `entity.id` é único;
- `components` não pode ser vazio;
- `component.kind` é único por entidade;
- se existir componente replicado, `networking.replication` deve estar em `systems`.

## Regra de evolução

Ao adicionar novo comportamento, preserve esta sequência:

1. contrato;
2. fixture;
3. validação;
4. CLI;
5. tool MCP;
6. documentação curta.

## Payload CI de replay (governança mínima)

Shape mínimo atual (CLI `run-replay --json` e MCP `run_replay.structuredContent`):

- `ciPayloadVersion`
- `scene`
- `ticks`
- `seed`
- `replaySignature`
- `snapshotOpcode`

Versão atual: `ciPayloadVersion: 1`.

Regra de evolução:

- qualquer mudança de shape do payload CI exige bump de `ciPayloadVersion`;
- CLI e MCP devem permanecer alinhados no mesmo shape/versionamento.

## Loop report headless (governança mínima)

Contrato público interno de `runMinimalSystemLoop` (runtime), `run-loop --json` (CLI) e `run_loop` (MCP):

- ver `docs/LOOP_REPORT_V1.md`.
- schema formal: `docs/schemas/loop-report-v1.schema.json`.
- systems conhecidos e deltas: `docs/SYSTEM_REGISTRY_V1.md`.

## Scene validation report v1 (pré-execução)

Contrato público interno para validação de cena antes da execução do loop:

- ver `docs/SCENE_VALIDATION_REPORT_V1.md`.
- schema formal: `docs/schemas/scene-validation-report-v1.schema.json`.

Separação explícita:

- `SceneValidationReport v1`: validação da cena;
- `LoopReport v1`: resultado de execução;
- `LoopTrace v1`: diagnóstico opt-in de execução;
- `System Registry v1`: catálogo de systems conhecidos.

## Execution plan v1 (planejamento sem execução)

Contrato público interno para planejar ordem de execução do loop sem rodar handlers:

- ver `docs/EXECUTION_PLAN_V1.md`.
- schema formal: `docs/schemas/execution-plan-v1.schema.json`.

Separação explícita:

- `SceneValidationReport v1`: validação prévia;
- `ExecutionPlan v1`: planejamento de ticks/systems e estimativa;
- `LoopReport v1`: resultado real após execução;
- `LoopTrace v1`: diagnóstico real por tick/system;
- `System Registry v1`: base de systems conhecidos para metadados/deltas.

## Loop Scheduler v1 (interno)

Fonte interna única da ordem por tick usada por:

- `ExecutionPlan v1`;
- `LoopReport v1` (via execução);
- `LoopTrace v1`.

Referência: `docs/LOOP_SCHEDULER_V1.md`.

Regra atual:

- ordem de systems por tick segue exatamente a ordem declarada na scene;
- sem fases/prioridades nesta versão.

## System Registry v1 (fonte de verdade de systems mínimos)

Contrato público interno para catalogar os systems mínimos conhecidos do loop headless:

- ver `docs/SYSTEM_REGISTRY_V1.md`.
- schema formal: `docs/schemas/system-registry-v1.schema.json`.

## Loop trace headless (diagnóstico opt-in)

Contrato opt-in de diagnóstico por tick/system:

- ver `docs/LOOP_TRACE_V1.md`.
- schema formal: `docs/schemas/loop-trace-v1.schema.json`.

Regra de compatibilidade:

- `LoopReport v1` permanece o contrato estável de resultado;
- habilitar trace não altera shape nem semântica do report padrão.

## Save versioning (política operacional mínima)

- `saveVersion: 1` é a única versão atualmente suportada.
- Versões diferentes falham de forma previsível no runtime/CLI/MCP.
- A falha é reportada em `$.saveVersion`.
- A mensagem atual é estável e usada pelos testes: `unsupported saveVersion: <valor>; supported: 1`.
- Ainda não existe migração automática de save.
