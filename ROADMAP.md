# Roadmap

## Fase 0 — concluída
Objetivo: deixar o Codex operar com segurança e previsibilidade.

Entregas concluídas:
- AGENTS.md útil e curto
- `.codex/config.toml` funcional
- subagentes iniciais
- skills iniciais
- schemas mínimos
- runtime mínimo para cenas
- CLI local
- MCP server com `validate_scene`
- testes de runtime e MCP

## Fase 1 — Runtime mínimo jogável
Objetivo: sair de contrato validável para loop executável.

Próximas entregas:
- prefab schema + prefab loader
- asset manifest
- system loop mínimo
- cena tutorial com bootstrap de systems
- `describe_scene` via MCP

Critério de saída:
- runtime carrega uma cena válida
- systems são instanciados a partir do contrato
- Codex consegue validar e descrever a cena por CLI e MCP

## Fase 2 — Rede e validação
Objetivo: robustez.

Entregas:
- servidor autoritativo
- entidade replicada
- snapshot de mundo
- replay de input
- smoke tests
- diff de save

## Fase 3 — Editor mínimo
Objetivo: produtividade de conteúdo.

Entregas:
- hierarchy
- inspector
- browser de assets
- prefab tool
- preview de cena
- validação inline

## Fase 4 — Maturidade AI-native
Objetivo: acelerar iteração com Codex.

Entregas:
- mais skills
- pacote plugin utilizável
- métricas de perf
- revisão assistida
- validações mais específicas por domínio
