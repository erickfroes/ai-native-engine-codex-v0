# Prompt inicial para colar no Codex

```text
Leia README.md, AGENTS.md e docs/CODEX_HANDOFF.md antes de editar qualquer coisa.

Depois execute esta sequência:
1. Rode `npm run smoke`.
2. Descreva rapidamente o que já funciona na V0.
3. Confirme se o MCP `ai_engine_tools` está ativo.
4. Use a tool `validate_scene` em `./scenes/tutorial.scene.json`.
5. Use a tool `emit_world_snapshot` em `./scenes/tutorial.scene.json`.
6. Compare runtime/CLI/MCP para `world.snapshot`.
7. Proponha um plano em 3 commits pequenos para evoluir a V0 sem quebrar contratos.
8. Execute apenas o primeiro commit.
9. Ao final, mostre quais arquivos mudaram, quais testes rodaram e o que ainda falta.

Restrições:
- mantenha mudanças pequenas;
- preserve compatibilidade com os schemas atuais;
- atualize docs curtas se mudar comportamento;
- se tocar schema, atualize fixtures e validação.
```
