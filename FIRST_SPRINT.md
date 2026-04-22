# Primeiro sprint após a V0

A V0 já entrega validação de cena por CLI e MCP.

## Meta do sprint

Transformar contrato de cena em bootstrap executável do runtime.

## Backlog sugerido

1. Criar `schemas/prefab.schema.json`
2. Adicionar `prefabs/hero.prefab.json`
3. Implementar loader de prefab no runtime
4. Permitir referência `prefab` em entidades com expansão previsível
5. Adicionar comando `describe-scene` ao MCP como `describe_scene`
6. Criar `assets/manifest.json`
7. Validar `assetRefs` contra manifesto quando ele existir
8. Adicionar uma fixture de cena que use prefab
9. Atualizar docs e AGENTS quando o fluxo novo estabilizar

## Critério de aceite

- `npm test` passa
- `npm run validate:scenes` passa
- Codex consegue usar `validate_scene` e `describe_scene`
- pelo menos uma cena válida usa prefab sem ambiguidade
