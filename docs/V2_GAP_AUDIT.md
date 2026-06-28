# V2 Gap Audit

## Objetivo

Registrar o audit pequeno pedido apos o congelamento de `entity.prefab` v1 e a decisao do menor pacote seguro que abriu V2.

Este documento e historico. A decisao principal ja foi executada por `Visual Regression Baseline v1`, o follow-up imediato foi fechado como `SceneTransitionReport v1`, a composicao minima foi fechada como `Scene Composition Manifest v1`, o primeiro diagnostico de grid foi fechado como `Pathfinding Grid v1`, o manifesto atlas/material foi fechado como `Atlas/Material Manifest v1`, o consumo visual sprite-only foi fechado como `Atlas Region Consumption v1`, o binding explicito de sprites foi fechado como `Atlas Region Binding Contract v1`, telas pequenas de producao foram fechadas como `UI Production Screens v1` e foco/navegacao minima foi fechado como `UI Navigation/Focus Lite v1` report-only; a continuidade agora aponta para `UI Action Semantics Lite v1`.

## Estado consolidado

- V1 Small 2D esta release-checkpointed e permanece aberta apenas para bugfix, hardening e compatibilidade.
- Audio Lite v1, UI System v1, UI Production Screens v1, UI Navigation/Focus Lite v1 report-only, Sprite Animation v1, Portable HTML Export v2, Prefab System v1, AssetManifestValidationReport v1, Visual Regression Baseline v1, SceneTransitionReport v1, Scene Composition Manifest v1, Pathfinding Grid v1, Atlas/Material Manifest v1, Atlas Region Consumption v1 sprite-only e Atlas Region Binding Contract v1 ja iniciam V2 em slices pequenos.
- `entity.prefab` v1 esta congelado: sem nested prefab, prefab hierarchy, hot reload, editor ou template engine.
- O hardening de prefab inseguro ja cobre consumidores visuais/export por path, incluindo Render SVG, SVG Demo HTML, Canvas2D Demo, Simple HTML Export e Portable HTML Export.

## Lacunas V2 avaliadas

| Lacuna V2 | Tamanho | Risco | Decisao |
| --- | --- | --- | --- |
| Visual regression basica | pequeno | baixo/medio | Executado como `VisualRegressionBaselineReport v1`. |
| Scene transitions / composition | medio | medio | `SceneTransitionReport v1` e `Scene Composition Manifest v1` executados como superficies report-only. |
| Particle-lite | medio | medio | Deixar para depois; toca render/tempo/fixtures. |
| Atlas/material manifest | medio/grande | medio/alto | Executado como `Atlas/Material Manifest v1`, ancorado em `Asset Manifest v1`. |
| Atlas region consumption | medio | medio/alto | Executado como consumo sprite-only opt-in em Browser Demo e Portable Export v2. |
| Atlas region binding contract | medio | medio/alto | Executado para sprites via `atlasBindingId`, sideband versionado/hash e tiles report-only. |
| Editor-lite automatizavel | grande | alto | Nao iniciar antes de contratos V2 menores. |
| Pathfinding grid v1 | medio | medio | Executado como `PathfindingGridReport v1`, report-only e sem route solving. |

## Guardrail de validacao

Durante o audit foi confirmado que `validate-scene` / `validate_scene` continuam emitindo `SceneValidationReport v1` com escopo pre-loop minimalista. Essa superficie valida leitura/JSON e systems conhecidos, mas nao deve ser tratada hoje como gate completo de schema, invariantes de componentes ou resolucao de `entity.prefab`.

Consumidores por path que passam por `validateSceneFile` ja falham de forma previsivel para refs `entity.prefab` inseguras. Portanto, qualquer pacote que precise garantir seguranca de prefab deve usar consumidores por path ou fechar antes um slice pequeno de decisao/hardening da superficie `validate_scene`.

Se essa lacuna for fechada, o caminho seguro e criar uma superficie opt-in nova, por exemplo `validate-scene-strict` / `validate_scene_strict`, com schema/doc proprios para o report estrito. Nao mutar `SceneValidationReport v1` nem o comportamento padrao de `validate-scene` / `validate_scene` em-place.

## Decisao de continuidade

O audit encontrou dois candidatos pequenos:

- `Visual Regression Baseline v1`: menor risco, fortalece render/export antes de abrir novas telas/cenas e nao muda semantica de gameplay.
- `Scene Transition v1`: mais diretamente ligado ao criterio V2 de jogos com multiplas cenas, mas toca fluxo de estado e navegacao entre cenas.

Decisao executada: fazer primeiro **Visual Regression Baseline v1** e depois fechar **SceneTransitionReport v1** como primeiro diagnostico multi-cena report-only.

## Pacote executado

**Visual Regression Baseline v1** foi fechado como primeiro pacote V2 pos-audit.

Escopo executado:

- criar um report/baseline opt-in derivado de `RenderSnapshot v1` e `Render SVG v1`;
- cobrir inicialmente `scenes/v1-small-2d.scene.json` e `fixtures/assets/visual-sprite.scene.json`;
- expor runtime, CLI e MCP com shape versionado;
- comparar hashes/campos deterministas, sem screenshot obrigatorio e sem browser pixel-diff;
- preservar `RenderSnapshot v1`, `Render SVG v1`, Browser Demo, exports HTML e Prefab System v1 sem mutacao de contrato.

**SceneTransitionReport v1** foi fechado em seguida como diagnostico opt-in entre duas cenas explicitas.

Escopo executado:

- criar report versionado para `fromPath` e `toPath`;
- validar cada endpoint por `validateSceneFile`;
- expor runtime, CLI e MCP com shape alinhado;
- cobrir casos validos, target invalido, arquivo ausente, warning de mesmo path e paridade cross-interface;
- preservar `Scene Document v1`, `SceneValidationReport v1`, loop, render, Browser Demo, exports HTML e `savegame v1`.

**Scene Composition Manifest v1** foi fechado como composicao minima externa e opt-in.

Escopo executado:

- criar manifesto versionado com `entryScene` e refs explicitas para cenas validas;
- validar paths relativos seguros ao diretorio do manifesto;
- validar cada cena referenciada por `validateSceneFile`;
- expor runtime, CLI e MCP com shape alinhado;
- cobrir fixture minima de tres cenas, manifesto ausente/malformado, entry ausente, refs/paths duplicados, path inseguro/extensao errada e cena referenciada invalida;
- preservar `Scene Document v1`, `SceneValidationReport v1`, `SceneTransitionReport v1`, loop, render, Browser Demo, exports HTML e `savegame v1`.

**Pathfinding Grid v1** foi fechado como primeiro diagnostico de ocupacao de grid report-only.

Escopo executado:

- criar `PathfindingGridReport v1` derivado de `tile.layer` e `collision.bounds`;
- expor runtime, CLI e MCP com shape alinhado;
- cobrir fixture minima, cena sem grids, multiplas layers, cena invalida, limite de celulas e paridade cross-interface;
- preservar loop, render, Browser Demo, exports HTML, `savegame v1` e route solving fora do escopo.

**Atlas/Material Manifest v1** foi fechado como contrato atlas/material, **Atlas Region Consumption v1** fechou o consumo sprite-only opt-in em Browser Demo e Portable HTML Export v2, e **Atlas Region Binding Contract v1** fechou o binding explicito de sprites.

Escopo executado:

- criar manifesto versionado com `assetManifestPath`, `atlases[].regions`, `materials[]`, `sprites[]` e `tiles[]`;
- validar path seguro para `Asset Manifest v1`;
- validar refs de asset, atlas, region e material;
- validar bounds de regioes contra `assets[].width/height`;
- expor runtime, CLI e MCP com shape alinhado;
- cobrir fixture minima, duplicidade, path inseguro, refs ausentes, region fora de bounds, warnings de orfaos, arquivo ausente/malformado e paridade cross-interface;
- preservar `RenderSnapshot v1`, loop, savegame e pipeline visual amplo fora do escopo; Browser Demo e Portable HTML Export v2 consomem apenas sprites atlas-backed por opt-in.
- adicionar `visual.sprite.fields.atlasBindingId` como referencia explicita para `sprites[].id`;
- versionar/hashar o sideband `metadata.atlasMaterial` com `atlasRegionBindingContractVersion`, `bindingHash` e `bindingSource`;
- manter `tiles[]` validado/report-only ate contrato proprio de tile atlas-backed.

**UI Production Screens v1** foi fechado como base pequena de telas declarativas.

Escopo executado:

- criar `scenes/ui-production-screens.scene.json` com `hud.main` e `menu.main` ativos e `pause.overlay` inativo/autoravel;
- manter `ui.screen` v1 sem novos campos, widgets, navegacao, foco ou binding;
- garantir paridade runtime/CLI/MCP para `UiSystemReport v1`;
- garantir Browser Demo, Simple HTML Export e Portable HTML Export com `uiSystem` opt-in;
- preservar `RenderSnapshot v1` sem drawCalls de UI, HUD Lite, Playable Save/Load Lite, Audio Lite, loop e save/load sem acoplamento;
- adicionar budget pequeno para delta de HTML do overlay.

Proximo pacote recomendado: **UI Action Semantics Lite v1**, para declarar semantica de acao/foco antes de qualquer consumo interativo no Browser Demo/export.

Fora de escopo:

- renderer novo, Pixi, Three, WebGL ou WebGPU;
- pipeline pesado de assets;
- pipeline pesado de atlas/material alem do manifesto minimo;
- nested prefab ou nova semantica de prefab;
- editor visual;
- 3D.

## Criterio de pronto executado

- contrato curto e schema do report, se houver envelope publico;
- fixture minima de baseline em testes deterministas;
- testes runtime/CLI/MCP cross-interface;
- `npm test`, `npm run validate:scenes` e `npm run smoke` verdes;
- docs atualizadas e `docs/CODEX_HANDOFF.md` reescrito para o menor passo seguinte.
