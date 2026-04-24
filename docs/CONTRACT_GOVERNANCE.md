# Contract Governance

## Objetivo

Definir como evoluir contratos v1 para v2 sem quebrar compatibilidade operacional entre runtime, CLI, MCP e testes.

## Contratos v1 governados

- `LoopReport v1`
- `LoopTrace v1`
- `SceneValidationReport v1`
- `ExecutionPlan v1`
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

- `Loop Scheduler v1` define ordem real por tick.
- `System Registry v1` define metadados semânticos de systems conhecidos.
- `System Phase Registry v1` é metadata de classificação e **não** altera ordem em v1.

