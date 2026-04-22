# AGENTS.md

## Missão do repositório

Este projeto implementa um **game engine AI-native**.
O objetivo é maximizar:

- clareza estrutural,
- segurança de mudança,
- validação automática,
- produtividade com Codex.

## Antes de editar qualquer coisa

Leia nesta ordem:

1. `README.md`
2. `docs/CODEX_HANDOFF.md`
3. `SPEC.md`
4. `docs/module-contracts.md`
5. `schemas/`
6. este arquivo

## Layout importante

- `engine/runtime/` -> runtime e CLI
- `scenes/` -> fixtures de validação
- `schemas/` -> contratos formais
- `tools/mcp-server/` -> ferramentas MCP do domínio
- `.codex/agents/` -> subagentes especializados
- `.agents/skills/` -> workflows reutilizáveis
- `plugins/engine-codex-integration/` -> pacote opcional de distribuição

## Regras de mudança

1. Faça a menor mudança defensável.
2. Não misture refatoração ampla com feature nova.
3. Não introduza comportamento implícito quando um contrato formal resolver.
4. Se um schema mudar, atualize validação, documentação e fixtures.
5. Se a mudança tocar render, registre impacto de performance.
6. Se a mudança tocar rede, mantenha versão, direção e payload explícitos.
7. Se a mudança tocar savegame, preserve compatibilidade ou documente migração.
8. Componentes ECS devem permanecer dados simples; comportamento vai para sistemas.

## Use MCP quando apropriado

Sempre prefira as ferramentas MCP do projeto para:

- validar cenas;
- inspecionar erros de contrato;
- medir se uma alteração manteve os invariantes esperados.

Se a tool existir, não replique manualmente por edição cega de arquivos.

## Quando usar subagentes

- `render_architect`: pipeline de render, materiais, frame graph, métricas visuais.
- `gameplay_worker`: implementação direta de sistemas e integrações.
- `perf_auditor`: benchmark, replay e regressões.

## Definição de pronto

Uma tarefa só está pronta quando, se aplicável:

- contratos relevantes continuam válidos;
- `npm test` passa;
- `npm run validate:scenes` passa;
- cenas de exemplo continuam carregando;
- documentação curta foi atualizada;
- a mudança é revisável em diff pequeno.

## Não fazer

- Não esconder lógica crítica em macros mágicas.
- Não duplicar formato de dados sem motivo forte.
- Não criar dependências cíclicas entre módulos.
- Não acoplar gameplay ao backend gráfico.
- Não introduzir ferramenta GUI-only se existir necessidade clara de automação.

## Estilo de implementação

- nomes claros;
- poucas abstrações por arquivo;
- comentários explicam intenção, não o óbvio;
- testes pequenos e reproduzíveis;
- exemplos mínimos funcionais.

## Instrução operacional para Codex

Se a tarefa envolver validação de cena, use a tool MCP `validate_scene` antes de editar arquivos.
Se a tarefa for grande, quebre em plano, contrato, implementação, validação e revisão.
Se surgir incerteza sobre comportamento, preserve compatibilidade com a V0 e adicione fixture de teste.
