# Prompt inicial para colar no Codex

```text
Leia README.md, AGENTS.md, docs/CODEX_HANDOFF.md e docs/PHASE_CHECKLIST.md antes de editar qualquer coisa.

Depois execute esta sequência:
1. Rode `npm run smoke`.
2. Descreva rapidamente o que já funciona na V0.
3. Confirme se o MCP `ai_engine_tools` está ativo.
4. Use as tools `validate_scene`, `validate_network`, `diff_network_snapshots` e `replay_first_loop` em `./scenes/tutorial.scene.json`, `./scenes/tutorial.netmsg.json` e no par `tutorial.netmsg.json -> tutorial.netmsg.tick43.json`.
5. Compare os resultados das tools com `npm run validate:scene -- ./scenes/tutorial.scene.json`, `npm run validate:network -- ./scenes/tutorial.netmsg.json`, `npm run diff:network -- ./scenes/tutorial.netmsg.json ./scenes/tutorial.netmsg.tick43.json` e `npm run replay:first-loop -- ./scenes/tutorial.scene.json 3`.
6. Proponha um plano em 3 commits pequenos para iniciar a Fase 2 sem quebrar contratos da V0.
7. Execute apenas o primeiro commit.
8. Ao final, mostre quais arquivos mudaram, quais testes rodaram e o que ainda falta.

Restrições:
- mantenha mudanças pequenas;
- preserve compatibilidade com os schemas atuais;
- atualize docs curtas se mudar comportamento;
- se tocar schema, atualize fixtures e validação.
```
