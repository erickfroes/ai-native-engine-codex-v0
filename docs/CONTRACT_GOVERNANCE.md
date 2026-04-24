# Contract Governance

## Objetivo

Definir como evoluir contratos v1 para v2 sem quebrar compatibilidade operacional entre runtime, CLI, MCP e testes.

## Contratos v1 governados

- `SceneDocument v1` (input)
- `LoopReport v1`
- `LoopTrace v1`
- `SceneValidationReport v1`
- `ExecutionPlan v1`
- `StateSnapshot v1` (opt-in)
- `StateSimulationReport v1` (opt-in)
- `StateMutationTrace v1` (opt-in)
- `ComponentRegistry v1` (interno)
- `StateProcessorRegistry v1` (interno, opt-in)
- `System Registry v1`
- `System Phase Registry v1`

## Regras de evolução

1. **Não mutar shape v1 em-place**  
   Qualquer mudança estrutural incompatível deve criar um contrato v2 separado.

2. **Schema primeiro**  
   Toda evolução começa em `docs/schemas/` e documentação dedicada.

3. **Compatibilidade por interface**  
   Runtime, CLI e MCP devem permanecer semanticamente alinhados para o mesmo contrato/versionamento.

4. **Default path estável**  
   Fluxos padrão (`run-loop`, `plan-loop`, `validate-scene`, MCP default tools) não devem mudar contrato sem version bump explícito.

5. **Governance tests obrigatórios**  
   Mudanças de contrato devem atualizar/adicionar testes de governança para detectar drift de shape/semântica.

## Playbook v1 -> v2

1. Criar novo schema (`*-v2.schema.json`).
2. Criar doc dedicada (`*_V2.md`) com diferenças explícitas.
3. Implementar via opt-in (flag/comando/tool novo ou envelope versionado).
4. Manter v1 funcionando no caminho padrão.
5. Adicionar testes cross-interface para v2 e regressão de v1.

## Relação com scheduler/registry

- `SceneDocument v1` define o shape do input aceito.
- `State Model v1` é representação interna derivada do `SceneDocument v1`.
- `StateSnapshot v1` é contrato opt-in de inspeção, sem embutir estado no `LoopReport v1`.
- `ComponentRegistry v1` cataloga componentes conhecidos do state model.
- `StateProcessorRegistry v1` cataloga processadores de estado opt-in.
- `StateSimulationReport v1` é saída opt-in independente de `LoopReport v1`.
- `StateMutationTrace v1` é diagnóstico opt-in complementar ao `StateSimulationReport v1`.
- `Loop Scheduler v1` define ordem real por tick.
- `System Registry v1` define metadados semânticos de systems conhecidos.
- `System Phase Registry v1` é metadata de classificação e **não** altera ordem em v1.
