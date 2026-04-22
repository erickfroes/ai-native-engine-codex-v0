---
name: create-gameplay-system
description: Use esta skill quando a tarefa pedir um novo sistema de gameplay, uma mecânica baseada em ECS, um fluxo de estado de entidades ou integração de gameplay com UI e cena. Não use para mudanças puramente de render ou apenas importação de assets.
---

Objetivo: criar um sistema de gameplay de forma consistente com a arquitetura do engine.

Passos:

1. Identifique o comportamento pedido e reduza a responsabilidade do sistema a uma frase.
2. Liste os componentes necessários e se eles já existem.
3. Se um componente novo for preciso, defina seu contrato serializável antes da implementação.
4. Implemente o sistema no módulo correto, sem acoplar ao renderer.
5. Crie ou ajuste a cena mínima de teste.
6. Adicione smoke test, teste unitário ou replay mínimo, conforme aplicável.
7. Atualize documentação curta se a mudança alterar workflow ou contrato.

Checklist final:

- componentes continuam sendo dados
- comportamento está em sistema
- schema/documentação foram atualizados se necessário
- teste mínimo existe
