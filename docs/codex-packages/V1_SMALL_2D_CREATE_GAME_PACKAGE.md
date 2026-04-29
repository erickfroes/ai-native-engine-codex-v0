# Codex Package - V1 Small 2D Create Game

## Objetivo

Use este pacote de prompt quando o Codex precisar criar ou adaptar um jogo pequeno 2D a partir dos templates V1 existentes.

O fluxo e copiar-e-adaptar. Nao crie template engine, prefab system, editor, fisica, pathfinding, UI system completo, audio, animation ou runtime novo.

## Branch

Use uma branch de feature:

```text
codex/<game-name>-v1-small-2d
```

Nunca edite diretamente em `main`.

## Baseline antes de editar

```bash
git status -sb
git log --oneline -n 10
git remote -v
npm test
npm run validate:scenes
npm run smoke
```

Se a baseline falhar, pare antes de editar.

## Leitura obrigatoria

- `AGENTS.md`
- `README.md`
- `ROADMAP.md`
- `docs/ENGINE_VERSION_ROADMAP.md`
- `docs/CODEX_HANDOFF.md`
- `docs/STATUS.md`
- `docs/module-contracts.md`
- `docs/GAME_TEMPLATES_V1.md`
- `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`
- `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`
- `docs/SIMPLE_HTML_EXPORT_V1.md`
- `docs/BROWSER_PLAYABLE_DEMO_V1.md`
- `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`
- `templates/top-down-basic/README.md`
- `templates/side-view-blocking-basic/README.md`

## Subagentes recomendados

- `explorer`: mapear template escolhido, comandos e docs.
- `engine_architect`: bloquear escopo fora de V1.
- `gameplay_worker`: adaptar apenas dados da cena.
- `render_architect`: revisar fallback visual, camera.viewport e HTML exportado.
- `qa_contract_auditor`: revisar comandos, fixtures, envelopes e checklist.
- `perf_auditor`: revisar drawCalls, blockers, sizeBytes e determinismo.
- `docs_handoff_auditor`: revisar README local, status e handoff.

## Ordem de commits sugerida

1. Copiar template e definir identidade do jogo.
2. Adaptar layout, player, camera e marcador visual.
3. Atualizar intents bloqueado/livre e docs locais.
4. Validar Browser Demo e Simple HTML Export.
5. Atualizar handoff/checklist do jogo.

## Prompt base

```text
Crie um jogo V1 Small 2D pequeno por copia/adaptacao de template.

Use como base:
- templates/top-down-basic
ou
- templates/side-view-blocking-basic

Nao crie runtime novo, schema novo, comando novo, tool MCP nova, template engine, prefab system, editor, fisica, gravidade, jump, pathfinding, combate, inventario, UI system completo, audio ou animation.

Preserve:
- Scene Document v1;
- systems: ["core.loop", "input.keyboard"];
- player.hero controlavel;
- tile.layer pequeno;
- camera.viewport;
- collision.bounds;
- visual fallback deterministico;
- um intent bloqueado;
- um intent livre.

Entregue:
- cena adaptada;
- intents locais;
- README curto do jogo;
- validacao por CLI;
- Browser Demo default e com opt-ins;
- export-html-game default e com opt-ins;
- checklist final.
```

## Criterios de aceite

- `validate-scene` passa para a cena criada.
- `validate-input-intent` passa para intents locais.
- `inspect-movement-blocking` mostra um caminho bloqueado e um caminho livre.
- `render-browser-demo` funciona sem flags.
- `render-browser-demo --movement-blocking --gameplay-hud --playable-save-load` funciona.
- `export-html-game` funciona sem flags.
- `export-html-game --movement-blocking --gameplay-hud --playable-save-load` funciona.
- HTML exportado nao usa APIs proibidas.
- Budgets pequenos continuam respeitados.
- O gate do jogo criado foi rodado explicitamente no diretorio do prototipo; `npm run validate:scenes` sozinho nao cobre jogos copiados para `tmp/` ou outro diretorio.
- O fluxo MCP equivalente foi coberto quando a entrega depender de MCP.
- `npm test`, `npm run validate:scenes` e `npm run smoke` passam.

## Formato final de entrega

- Subagentes usados.
- Commits criados.
- Template escolhido.
- Arquivos criados/alterados.
- Comandos executados.
- Caminho bloqueado e caminho livre.
- Export HTML gerado.
- Fora de escopo preservado.
- Hashes dos commits.
- Dizer explicitamente: `pode mergear` ou `nao mergear ainda`.
