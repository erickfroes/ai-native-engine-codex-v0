# STATUS — V0 (resumo curto)

## Estado atual da V0

A V0 está funcional e orientada a contrato: cenas são validadas por schema + invariantes, com suporte a replay determinístico e snapshot mínimo para rede.

## Foco atual (runtime/CLI/MCP)

- **Runtime**: manter evolução incremental com determinismo e compatibilidade dos contratos.
- **CLI**: permanecer como superfície canônica de automação local.
- **MCP**: manter paridade com a CLI nas capacidades críticas para agentes.

## 3 riscos principais

1. **Drift de documentação**: docs podem descolar do estado real do runtime.
2. **Drift de paridade CLI/MCP**: novas capacidades podem aparecer em uma interface e faltar na outra.
3. **Falsa completude de rede/runtime real-time**: validação e contratos evoluem mais rápido que a integração online em tempo de execução.

## Próximos 3 passos objetivos

1. Entregar replicação **real-time mínima** no loop de runtime.
2. Expandir replay para **multi-sistema** com verificação determinística.
3. Publicar **métricas de tick para CI** como baseline de evolução.
