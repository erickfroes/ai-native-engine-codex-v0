---
name: add-networked-entity
description: Use esta skill quando a tarefa pedir uma nova entidade replicada em rede, uma mecânica com authority de servidor, snapshots, mensagens versionadas ou sincronização cliente-servidor.
---

Objetivo: adicionar uma entidade ou feature de rede sem quebrar contratos.

Passos:

1. Defina a authority da entidade.
2. Declare quais componentes replicam e quais são locais.
3. Defina ou atualize mensagens com `opcode`, `version`, `direction` e `payload`.
4. Verifique se a serialização é estável.
5. Crie simulação mínima cliente/servidor ou replay compatível.
6. Atualize validação de contratos de rede.
7. Documente qualquer migração ou incompatibilidade de protocolo.

Checklist final:

- direction e version estão explícitos
- payload é mínimo e claro
- entidade consegue ser validada em simulação
- não há lógica de rede escondida no renderer ou na UI
