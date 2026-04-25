# LoopReport v1

## Objetivo

Descrever o contrato público interno usado pelo loop headless do engine nas interfaces:

- runtime
- CLI `run-loop --json`
- MCP `run_loop`

## Shape

```json
{
  "loopReportVersion": 1,
  "scene": "string",
  "ticks": 0,
  "seed": 0,
  "ticksExecuted": 0,
  "finalState": 0,
  "executedSystems": ["string"]
}
```

Schema formal: `docs/schemas/loop-report-v1.schema.json`.
Diagnóstico opt-in separado: `docs/LOOP_TRACE_V1.md` (não altera o shape do report v1).

## Semântica dos campos

- `loopReportVersion`:
  versão do contrato do relatório. Atualmente sempre `1`.

- `scene`:
  caminho/nome da cena executada.

- `ticks`:
  quantidade solicitada de ticks.

- `seed`:
  seed usada na execução. Quando omitida, deve ser `1337`.

- `ticksExecuted`:
  quantidade efetivamente executada.

- `finalState`:
  estado numérico final produzido pela soma determinística dos systems executados.

- `executedSystems`:
  ordem dos systems executados por tick, preservando a ordem declarada na cena.

## Systems conhecidos no contrato atual

Fonte de verdade: `docs/SYSTEM_REGISTRY_V1.md`.

- `core.loop`: `+1` por tick
- `input.keyboard`: `+3` por tick
- `networking.replication`: `+2` por tick

## Integração opt-in com Input Intent v1

- sem input intent, a semântica acima permanece inalterada;
- com input intent opt-in e `tick` correspondente, `input.keyboard` pode aplicar `sum(actions[].axis.x + actions[].axis.y)` no lugar do `+3`;
- o shape do `LoopReport v1` não muda por causa dessa opção.

## Exemplo

Input:

- scene: `tutorial.scene.json`
- ticks: `4`
- seed: `10`

Output esperado:

```json
{
  "loopReportVersion": 1,
  "scene": "tutorial.scene.json",
  "ticks": 4,
  "seed": 10,
  "ticksExecuted": 4,
  "finalState": 34,
  "executedSystems": ["..."]
}
```

## Seed default

Quando seed for omitida:

- seed deve ser `1337`
- com `ticks=4` e systems atuais, `finalState` esperado é `1361`

## Contrato de erro

### Runtime

Erros são expostos como exceções previsíveis.

Casos cobertos:

- ticks inválido
- arquivo inexistente
- JSON malformado
- cena inválida
- system desconhecido

### CLI

Erros devem resultar em:

- exit code não-zero
- mensagem em `stderr`
- sem saída JSON de sucesso

### MCP

Erros devem resultar em:

- `isError: true`
- conteúdo estruturado quando aplicável
- `errorName` preservado para JSON malformado
