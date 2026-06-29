# Contratos de módulo

## Runtime V0

A V0 tem um único objetivo operacional: transformar contrato de cena em algo carregável, validável e acionável via MCP.

### Responsabilidades atuais

- `engine/runtime/src/schema/`:
  - carregar schemas do repositório;
  - validar dados com um subconjunto previsível de JSON Schema.

- `engine/runtime/src/scene/`:
  - carregar cenas JSON;
  - validar shape e invariantes;
  - produzir resumo serializável.

- `engine/runtime/src/network/`:
  - gerar `world.snapshot` mínimo a partir de componentes replicados;
  - validar a mensagem contra `schemas/net_message.schema.json`.

- `engine/runtime/src/replay/`:
  - executar replay determinístico mínimo por ticks na ordem dos systems da cena;
  - retornar snapshot final para comparação reproduzível;
  - gerar `replaySignature` estável a partir de serialização canônica.
  - expor payload CI mínimo alinhado entre CLI e MCP.

- `engine/runtime/src/cli.mjs`:
  - expor comandos para humanos e para automação.

- `tools/mcp-server/src/`:
  - adaptar o runtime para o protocolo MCP via stdio.

## Contratos importantes

### Cena válida

Uma cena válida precisa satisfazer:

1. `schemas/scene.schema.json`
2. `schemas/component.schema.json`
3. invariantes adicionais do runtime

### Invariantes adicionais da V0

- `entity.id` é único;
- `components` não pode ser vazio;
- `component.kind` é único por entidade;
- se existir componente replicado, `networking.replication` deve estar em `systems`.

## Regra de evolução

Ao adicionar novo comportamento, preserve esta sequência:

1. contrato;
2. fixture;
3. validação;
4. CLI;
5. tool MCP;
6. documentação curta.

## Payload CI de replay (governança mínima)

Shape mínimo atual (CLI `run-replay --json` e MCP `run_replay.structuredContent`):

- `ciPayloadVersion`
- `scene`
- `ticks`
- `seed`
- `replaySignature`
- `snapshotOpcode`

Versão atual: `ciPayloadVersion: 1`.

Regra de evolução:

- qualquer mudança de shape do payload CI exige bump de `ciPayloadVersion`;
- CLI e MCP devem permanecer alinhados no mesmo shape/versionamento.

## Loop report headless (governança mínima)

Contrato público interno de `runMinimalSystemLoop` (runtime), `run-loop --json` (CLI) e `run_loop` (MCP):

- ver `docs/LOOP_REPORT_V1.md`.
- schema formal: `docs/schemas/loop-report-v1.schema.json`.
- systems conhecidos e deltas: `docs/SYSTEM_REGISTRY_V1.md`.

## Scene validation report v1 (pré-execução)

Contrato público interno para preflight minimo de cena antes da execução do loop:

- ver `docs/SCENE_VALIDATION_REPORT_V1.md`.
- schema formal: `docs/schemas/scene-validation-report-v1.schema.json`.
- cobre arquivo/JSON e systems conhecidos no caminho `validate-scene` / `validate_scene`;
- nao substitui a validacao estrita por path (`validateSceneFile`) usada por consumidores que precisam de schema, invariantes de componentes e resolucao segura de `entity.prefab`.

Separação explícita:

- `SceneValidationReport v1`: validação da cena;
- `LoopReport v1`: resultado de execução;
- `LoopTrace v1`: diagnóstico opt-in de execução;
- `System Registry v1`: catálogo de systems conhecidos.

## Scene Document v1 (contrato de input)

Contrato formal do formato atual de cena aceito pelo engine:

- ver `docs/SCENE_DOCUMENT_V1.md`.
- schema formal: `docs/schemas/scene-document-v1.schema.json`.

Relações:

- `Scene Document v1`: input de cena;
- `SceneValidationReport v1`: resultado da validação do input;
- `ExecutionPlan v1`: planejamento sobre input válido;
- `Loop Scheduler v1`: ordem real por tick;
- `LoopReport v1`: resultado real de execução;
- `LoopTrace v1`: diagnóstico real opt-in.

## Scene Transition Report v1 (transicao explicita opt-in)

Contrato de diagnostico para uma troca explicita entre duas cenas por path:

- ver `docs/SCENE_TRANSITION_V1.md`.
- schema formal: `docs/schemas/scene-transition-report-v1.schema.json`.
- runtime: `buildSceneTransitionReportV1({ fromPath, toPath })`.
- CLI: `inspect-scene-transition <from> <to> [--json]`.
- MCP: `inspect_scene_transition({ fromPath, toPath })`.
- cada endpoint passa por `validateSceneFile`, cobrindo schema, invariantes e resolucao segura de `entity.prefab`.
- `ok` so e verdadeiro quando source e target nao possuem erros.
- erros e warnings sao preservados por endpoint e agregados com `endpoint: from | to | transition`.
- nao altera `Scene Document v1`, `SceneValidationReport v1`, `run-loop`, render, Browser Demo, exports HTML ou `savegame v1`.
- nao adiciona system, componente, trigger automatico, carry-over de estado ou composition graph neste slice.

## Scene Composition Manifest v1 (composicao multi-cena opt-in)

Contrato externo e report-only para declarar uma composicao pequena de cenas por refs estaveis:

- ver `docs/SCENE_COMPOSITION_MANIFEST_V1.md`.
- schema formal do manifesto: `docs/schemas/scene-composition-manifest-v1.schema.json`.
- schema formal do report: `docs/schemas/scene-composition-manifest-report-v1.schema.json`.
- runtime: `buildSceneCompositionManifestReportV1(path)`.
- CLI: `inspect-scene-composition <path> [--json]`.
- MCP: `inspect_scene_composition({ path })`.
- `entryScene` referencia um `scenes[].ref`, nao um path.
- cada `scenes[].path` deve ser relativo seguro ao diretorio do manifesto, apontar para `.scene.json` e permanecer contido nesse diretorio.
- cada cena referenciada passa por `validateSceneFile`, cobrindo schema, invariantes e resolucao segura de `entity.prefab`.
- o report preserva o manifesto parseado quando possivel, agrega erros de manifesto e de cena e mantem summaries deterministas por ref.
- nao altera `Scene Document v1`, `SceneValidationReport v1`, `SceneTransitionReport v1`, `validate-scene`, `validate_scene`, `validate-all-scenes`, loop, render, Browser Demo, exports HTML ou `savegame v1`.
- nao adiciona navegacao runtime, trigger automatico, graph de transicao, carry-over de estado, nested manifests, editor ou servidor.

## Visual Components v1 (declarativo)

Contrato minimo para componentes visuais declarados na propria cena:

- ver `docs/VISUAL_COMPONENTS_V1.md`.
- componentes atuais: `visual.sprite` v1 e `tile.layer` v1.

Compatibilidade:

- declarativo e opt-in;
- sem `Asset Manifest v1`, o render continua com fallback `rect`;
- com `Asset Manifest v1`, `visual.sprite.fields.assetId` pode gerar drawCall `sprite` com `assetSrc`;
- `visual.sprite.fields.atlasBindingId` e opcional e so tem efeito nos fluxos que recebem `atlasMaterialManifestPath`;
- `tile.layer` compila uma grade declarativa para drawCalls `rect` deterministicas;
- nao cria editor, servidor, WebGL, Pixi, Three ou pipeline pesado de assets.

## Tile Layer v1 (mapa declarativo minimo)

Contrato declarativo minimo para camada de tile grid renderizavel:

- ver `docs/TILE_LAYER_V1.md`.

Compatibilidade:

- nao altera `RenderSnapshot v1` de forma incompativel;
- nao cria novo `drawCall.kind`;
- tiles `rect` viram drawCalls `rect` ordenadas por `layer` e `id`;
- tiles `empty` nao geram drawCall;
- sem `tile.layer`, cenas antigas continuam com o mesmo fallback `rect`;
- entries `rect` da palette podem declarar `solid: true` para Tile Collision v1 sem alterar render;
- fora de escopo: editor, autotile, bloqueio de movimento por tile, resolucao de colisao, pathfinding e chunk streaming.

## Tile Collision v1 (diagnostico minimo de tiles solidos)

Contrato deterministico para listar tiles solidos declarados em `tile.layer`:

- ver `docs/TILE_COLLISION_V1.md`.
- schema formal: `docs/schemas/tile-collision-report-v1.schema.json`.

Compatibilidade:

- gera `TileCollisionReport v1` via runtime, CLI e MCP;
- deriva apenas de entries `rect` em `tile.layer.fields.palette` com `solid: true`;
- cenas sem `tile.layer` ou sem tiles solidos retornam `tiles: []`;
- usa a mesma origem de `tile.layer`: `x = column * tileWidth`, `y = row * tileHeight`;
- usa `palette.width` e `palette.height` quando presentes, com fallback em `tileWidth` e `tileHeight`;
- ordena tiles por `layerEntityId`, depois `row`, depois `column`, depois `paletteId`;
- nao altera `RenderSnapshot v1`, Render SVG, Canvas2D Demo ou Browser Playable Demo por padrao;
- nao altera `CollisionBoundsReport v1` ou `CollisionOverlapReport v1`;
- nao adiciona fisica, resolucao de colisao, bloqueio de movimento por padrao, pathfinding, editor ou servidor.

## Camera Viewport v1 (offset declarativo minimo)

Contrato declarativo minimo para deslocar a camera nos drawCalls do render headless:

- ver `docs/CAMERA_VIEWPORT_V1.md`.

Compatibilidade:

- nao altera o shape de `RenderSnapshot v1`;
- sem `camera.viewport`, cenas antigas continuam iguais;
- com `camera.viewport`, o builder desloca drawCalls por offset e pode derivar `viewport.width` e `viewport.height`;
- nao adiciona zoom, culling, follow target, smooth camera, editor, Pixi, Three ou WebGL.

## Collision Bounds v1 (gameplay declarativo minimo)

Contrato declarativo minimo para bounds retangulares de colisao em entidades:

- ver `docs/COLLISION_BOUNDS_V1.md`.

Compatibilidade:

- gera `CollisionBoundsReport v1` via runtime, CLI e MCP;
- combina `transform` com offset local de `collision.bounds`;
- ordena bounds por `entityId` para preservar determinismo;
- cenas sem `collision.bounds` retornam `bounds: []`;
- nao altera `RenderSnapshot v1`, Render SVG, Canvas2D Demo ou Browser Playable Demo;
- nao adiciona fisica, resolucao de colisao, bloqueio de movimento, colisao com `tile.layer`, pathfinding, editor ou servidor.

## Collision Overlap v1 (diagnostico AABB minimo)

Contrato deterministico para detectar pares AABB sobrepostos a partir de `CollisionBoundsReport v1`:

- ver `docs/COLLISION_OVERLAP_V1.md`.

Compatibilidade:

- gera `CollisionOverlapReport v1` via runtime, CLI e MCP;
- deriva de `collision.bounds` sem alterar `CollisionBoundsReport v1`;
- usa pares unicos ordenados deterministicamente por `entityId`;
- cenas sem overlap retornam `overlaps: []`;
- nao altera `RenderSnapshot v1`, Render SVG, Canvas2D Demo ou Browser Playable Demo;
- nao adiciona fisica, resolucao de colisao, bloqueio de movimento, input blocking, colisao com `tile.layer`, pathfinding, editor ou servidor.

## Movement Blocking v1 (inspecao deterministica de movimento)

Contrato deterministico para avaliar uma tentativa de movimento de `InputIntent v1` contra `collision.bounds` solidos e tiles solidos de `tile.layer`:

- ver `docs/MOVEMENT_BLOCKING_V1.md`.

Compatibilidade:

- gera `MovementBlockingReport v1` via runtime, CLI e MCP;
- deriva de `CollisionBoundsReport v1` sem alterar `collision.bounds`, `CollisionBoundsReport v1` ou `CollisionOverlapReport v1`;
- pode reutilizar tiles solidos declarados em `tile.layer` sem alterar `TileCollisionReport v1`;
- usa `from`, `candidate` e `final` para separar posicao atual, tentativa e resultado efetivo do report;
- se a tentativa causaria overlap solido, `blocked: true` e `final` permanece igual a `from`;
- se a tentativa nao e bloqueada, `blocked: false` e `final` fica igual a `candidate`;
- multiplos bloqueadores solidos sao listados em `blockingEntities` com ordenacao deterministica;
- casos previsiveis cobertos: alvo ausente, alvo sem `transform`, alvo sem `collision.bounds`, input sem movimento ou com eixo `0,0`, input intent invalido/ausente e cena invalida/ausente;
- `run-loop`/`run_loop` continuam iguais por padrão;
- com `movementBlocking` no `run-loop`, o fluxo aplica bloqueio de deslocamento derivado de `InputIntent v1`;
- sem `movementBlocking`, não há alteração no resultado atual de `run-loop`;
- `run-loop` aplica apenas bloqueio de movimento (sem física completa);
- Browser Playable Demo pode aplicar blocking local opt-in com `render-browser-demo --movement-blocking` ou `render_browser_demo({ movementBlocking: true })`;
- Browser Playable Demo pode expor HUD Lite local opt-in com `render-browser-demo --gameplay-hud` ou `render_browser_demo({ gameplayHud: true })`;
- Browser Playable Demo pode expor Playable Save/Load Lite local opt-in com `render-browser-demo --playable-save-load` ou `render_browser_demo({ playableSaveLoad: true })`;
- Browser Playable Demo pode expor Audio Lite v1 diagnostico local opt-in com `render-browser-demo --audio-lite` ou `render_browser_demo({ audioLite: true })`;
- Browser Playable Demo pode expor Sprite Animation v1 visual local opt-in com `render-browser-demo --sprite-animation` ou `render_browser_demo({ spriteAnimation: true })`;
- Browser Playable Demo pode expor Atlas/Material Manifest v1 sprite-only opt-in com `render-browser-demo --atlas-material-manifest` ou `render_browser_demo({ atlasMaterialManifestPath })`;
- Browser Playable Demo pode expor UI System v1 visual local opt-in com `render-browser-demo --ui-system` ou `render_browser_demo({ uiSystem: true })`;
- sem essas flags/opcoes, Browser Playable Demo permanece igual;
- `InputIntent v1`, `KeyboardInputScript v1`, RenderSnapshot v1, Save/Load v1 e renderers permanecem inalterados;
- nao adiciona UI system completo, fisica completa, resolucao complexa, pathfinding, editor ou servidor.

## Pathfinding Grid v1 (ocupacao de grid report-only)

Contrato deterministico para diagnosticar ocupacao de grids 2D derivados de `tile.layer` e `collision.bounds`:

- ver `docs/PATHFINDING_GRID_V1.md`.
- schema formal: `docs/schemas/pathfinding-grid-report-v1.schema.json`.
- runtime: `buildPathfindingGridReportV1(sceneOrPath)`.
- CLI: `inspect-pathfinding-grid <scene> [--json]`.
- MCP: `inspect_pathfinding_grid({ path })`.
- cada `tile.layer` gera um grid separado, sem merge global.
- tiles solidos bloqueiam apenas celulas do proprio layer.
- `collision.bounds` solidos podem bloquear qualquer grid por overlap AABB com area positiva.
- `blockerId` e globalmente unico no report, com prefixos `tile:` e `collision.bounds:`.
- `tile.layer` preserva a semantica atual: `transform` da entidade de mapa nao e aplicado.
- `blockedCells[]` lista apenas celulas bloqueadas para manter payload pequeno; celulas caminhaveis sao implicitas por `rows * columns`.
- limite v1 por layer: `4096` celulas.
- nao altera `Scene Document v1`, `TileCollisionReport v1`, `CollisionBoundsReport v1`, `MovementBlockingReport v1`, `RenderSnapshot v1`, loop, Browser Demo, exports HTML ou `savegame v1`.
- nao adiciona A*, BFS, route solving, path following, navmesh, editor, servidor ou runtime AI.

## Input Intent v1 (input headless opt-in no loop)

Contrato de intenção de input headless, com integração opt-in no `run-loop`/`run_loop` e sem acoplamento com `Scene Document v1` ou `simulate-state`:

- ver `docs/INPUT_INTENT_V1.md`.
- schema formal: `docs/schemas/input-intent-v1.schema.json`.

Compatibilidade:

- sem input intent, o comportamento padrão de `run-loop`/`run_loop` permanece inalterado;
- `LoopReport v1` e `LoopTrace v1` mantêm o mesmo shape;
- `simulate-state` continua isolado deste contrato neste slice.

## Asset Manifest v1 (assets declarativos locais)

Contrato declarativo local para assets de sprite usados de forma opt-in por `RenderSnapshot v1`:

- ver `docs/ASSET_MANIFEST_V1.md`.
- schema formal: `docs/schemas/asset-manifest-v1.schema.json`.

Compatibilidade:

- sem manifesto, o comportamento padrao de `RenderSnapshot v1` permanece inalterado;
- nao altera `run-loop`;
- nao altera `InputIntent v1`;
- nao altera Save/Load v1;
- nao adiciona rede, editor ou pipeline pesado de assets.

## Asset Manifest Validation Report v1 (validacao direta)

Contrato minimo para validar um arquivo `Asset Manifest v1` diretamente, sem depender de `RenderSnapshot v1` ou dos consumidores visuais:

- ver `docs/ASSET_MANIFEST_VALIDATION_REPORT_V1.md`.
- schema formal: `docs/schemas/asset-manifest-validation-report-v1.schema.json`.
- runtime: `buildAssetManifestValidationReportV1(path)`.
- CLI: `validate-asset-manifest <path> [--json]`.
- MCP: `validate_asset_manifest({ path })`.
- preserva o manifesto parseado quando o JSON existe mas o contrato falha;
- retorna `assetManifest: null` para arquivo ausente ou JSON malformado, com mensagens estaveis;
- nao altera `Asset Manifest v1`, `RenderSnapshot v1`, Browser Demo, Canvas2D Demo ou exports HTML.

## Atlas/Material Manifest v1 (atlas e materiais)

Contrato externo para declarar regioes de atlas, materiais e bindings sprite/tile acima de um `Asset Manifest v1`:

- ver `docs/ATLAS_MATERIAL_MANIFEST_V1.md`.
- schema formal do manifesto: `docs/schemas/atlas-material-manifest-v1.schema.json`.
- schema formal do report: `docs/schemas/atlas-material-manifest-report-v1.schema.json`.
- runtime: `buildAtlasMaterialManifestReportV1(path)`.
- runtime visual opt-in: `resolveAtlasMaterialRenderInputsV1(scene, { atlasMaterialManifestPath })`.
- CLI: `inspect-atlas-material-manifest <path> [--json]`.
- CLI visual opt-in: `render-browser-demo --atlas-material-manifest <path>` e `export-portable-html-game --atlas-material-manifest <path>`.
- MCP: `inspect_atlas_material_manifest({ path })`.
- MCP visual opt-in: `render_browser_demo({ atlasMaterialManifestPath })` e `export_portable_html_game({ atlasMaterialManifestPath })`.
- `assetManifestPath` e relativo seguro ao diretorio do manifesto, deve apontar para `.asset-manifest.json` e nao pode usar URL, path absoluto, drive letter, glob ou `..`.
- cada `atlases[].assetId` deve existir no `Asset Manifest v1` referenciado.
- `atlases[].regions[]` valida bounds inteiros e garante que cada regiao cabe em `assets[].width/height`.
- `materials[]` valida `kind`, `sampler` e `alphaMode`.
- `sprites[]` e `tiles[]` validam atlas, region e material; sprites exigem material `kind: "sprite"` e tiles exigem material `kind: "tile"`.
- regioes ou materiais validos sem uso entram como warnings.
- consumo visual v1 e sprite-only: `visual.sprite.fields.atlasBindingId` resolve `sprites[].id` quando `atlasMaterialManifestPath` e fornecido.
- o fallback legado `visual.sprite.fields.assetId -> sprites[].id` permanece apenas por compatibilidade.
- Browser Demo e Portable HTML Export v2 consomem source rect por `metadata.atlasMaterial`, com `atlasRegionBindingContractVersion`, `bindingHash` e `bindingSource`, sem alterar o shape de `RenderSnapshot v1`.
- `tiles[]` permanece report-only por decisao deste contrato porque `tile.layer v1` ainda nao recebe binding atlas explicito.
- nao altera `Asset Manifest v1`, `RenderSnapshot v1`, Canvas2D Demo, Simple HTML Export, loop ou savegame.
- nao e importador/packer de atlas, renderer novo, material system completo, editor visual, tile animation ou pipeline pesado.

## Render Snapshot v1 (render headless declarativo)

Contrato JSON deterministico para descrever draw calls minimas sem canvas real:

- ver `docs/RENDER_SNAPSHOT_V1.md`.
- schema formal: `docs/schemas/render-snapshot-v1.schema.json`.

Compatibilidade:

- nao altera `run-loop`;
- nao altera `StateSnapshot v1`;
- nao altera Save/Load v1;
- nao altera `InputIntent v1`;
- `Asset Manifest v1` e opt-in e local; sem manifesto, o fallback atual para `rect` permanece;
- nao adiciona backend grafico ou assets reais obrigatorios.

## Render SVG v1 (serializacao textual deterministica)

Contrato textual minimo derivado de `RenderSnapshot v1` para comparacao headless:

- ver `docs/RENDER_SVG_V1.md`.

Compatibilidade:

- nao altera `RenderSnapshot v1`;
- nao altera `run-loop`;
- nao altera Save/Load v1;
- `sprite` usa fallback textual minimo para `rect` com `data-asset-id`;
- nao introduz backend grafico;
- nao representa runtime visual real nesta versao.

## Visual Regression Baseline Report v1

Contrato opt-in para regressao visual estrutural por hashes e campos deterministas derivados de `RenderSnapshot v1` e `Render SVG v1`:

- ver `docs/VISUAL_REGRESSION_BASELINE_V1.md`.
- schema formal: `docs/schemas/visual-regression-baseline-report-v1.schema.json`.
- runtime: `buildVisualRegressionBaselineReportV1(scenePathOuScene, options)`.
- CLI: `inspect-visual-regression-baseline <scene> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--json]`.
- MCP: `inspect_visual_regression_baseline({ path, tick?, width?, height?, assetManifestPath? })`.
- usa `snapshotHash` sobre o JSON canonico de `RenderSnapshot v1`.
- usa `svgHash` sobre a string deterministica de `Render SVG v1`.
- agrega `drawCallCount`, `drawCallsByKind`, `layers` e `uniqueSpriteAssetIds`.
- nao adiciona pixel-diff, screenshot, browser ou backend grafico.
- nao altera `RenderSnapshot v1`, `Render SVG v1`, `SceneValidationReport v1` ou `entity.prefab` v1.

## SVG Demo HTML v1 (visualizacao estatica textual)

Contrato minimo para embutir `Render SVG v1` em HTML deterministico e estatico:

- ver `docs/SVG_DEMO_HTML_V1.md`.

Compatibilidade:

- deriva de `Render SVG v1` sem alterar `RenderSnapshot v1`;
- nao altera `run-loop`;
- nao altera `InputIntent v1`;
- nao altera Save/Load v1.
- draw calls `sprite` usam fallback visual minimo no Canvas 2D local.
- se o `RenderSnapshot` inclui `assetSrc` e a browser demo recebeu `assetManifestPath`, o HTML resolve `assetSrc` para `file:///...` local e tenta `new Image()` / `drawImage`, com fallback para `rect` em erro.
- o loop visual do browser e local ao HTML e nao avanca simulacao sozinho.
- foco do canvas e controles locais de pause/reset pertencem ao HTML autocontido, nao ao loop headless.

## Browser Playable Demo Local State v1

Contrato local e manual para export/import dentro do HTML da Browser Playable Demo:

- ver `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`.

Compatibilidade:

- nao altera `RenderSnapshot v1`;
- nao altera `State Snapshot v1`;
- nao altera Save/Load v1, `savegame v1`, `save-state` ou `load-save`;
- nao usa `localStorage`, `sessionStorage`, `IndexedDB`, rede ou disco;
- existe apenas quando `--playable-save-load` ou `playableSaveLoad: true` sao usados;
- sem entidade controlavel, os controles de Playable Save/Load Lite nao sao renderizados;
- com `movementBlocking` ativo, import de posicao bloqueada e rejeitado de forma previsivel.

## Audio Lite v1

Contrato declarativo minimo para audio simples em cenas pequenas:

- ver `docs/AUDIO_LITE_V1.md`.
- componente: `audio.clip` v1.
- runtime: `buildAudioLiteReportV1(sceneOrPath)`.
- CLI: `inspect-audio-lite <scene> [--json]`.
- MCP: `inspect_audio_lite({ path })`.
- Browser Demo: `render-browser-demo --audio-lite` ou `render_browser_demo({ audioLite: true })`.
- Simple HTML Export: `export-html-game --audio-lite` ou `export_html_game({ audioLite: true })`.
- sem opt-in, Browser Demo e export nao embutem metadata/controles de audio.
- o runtime headless gera apenas report deterministico; nao toca audio.
- no browser/export, audio diagnostico so inicia apos gesto do usuario e cai para fallback silencioso quando necessario.
- nao altera `RenderSnapshot v1`, `run-loop`, `InputIntent v1`, Movement Blocking, Tile Collision ou Browser Demo Local State v1.
- nao e mixer completo, audio graph, spatial audio, streaming, timeline, editor, UI system completo ou runtime canonico de audio.

## UI System v1

Contrato declarativo minimo para screens de UI com arvore serializavel de widgets, usado tambem como base pequena de telas de producao:

- ver `docs/UI_SYSTEM_V1.md`.
- schema formal do report: `docs/schemas/ui-system-report-v1.schema.json`.
- componente: `ui.screen` v1.
- runtime: `buildUiSystemReportV1(sceneOrPath)`.
- CLI: `inspect-ui-system <scene> [--json]`.
- MCP: `inspect_ui_system({ path })`.
- `fields.screenId` deve ser string nao vazia e unica por cena.
- `fields.widgets` deve ser array nao vazio de widgets `panel`/`label`.
- widgets usam `id` unico por screen; `label` exige `text`; `panel` nao aceita `text`.
- caminhos de cena passam por `validateSceneFile`, entao `entity.prefab` por path ja chega resolvido ao report.
- o report expoe `screens[]`, lista flat `widgets[]` em pre-ordem e `widgetTree[]`.
- cena sem `ui.screen` retorna `screens: []` e `warnings: []`.
- Browser Demo: `render-browser-demo --ui-system` ou `render_browser_demo({ uiSystem: true })` embute `metadata.uiSystem` e um overlay DOM passivo em screen-space.
- Simple HTML Export: `export-html-game --ui-system` ou `export_html_game({ uiSystem: true })` escreve HTML autocontido com o mesmo overlay passivo.
- Portable HTML Export: `export-portable-html-game --ui-system` ou `export_portable_html_game({ uiSystem: true })` escreve HTML portatil com o mesmo overlay passivo.
- fixture publica de producao pequena: `scenes/ui-production-screens.scene.json`, com `hud.main` e `menu.main` ativos e `pause.overlay` inativo/autoravel.
- sem opt-in visual, Browser Demo e export nao embutem `metadata.uiSystem`.
- nao altera `RenderSnapshot v1`, HUD Lite, Audio Lite, Sprite Animation, InputIntent ou Save/Load.
- nao e layout engine completo, binding, navegacao, renderer formal de UI, editor de UI ou HUD canonico de jogo.

## UI Navigation/Focus Lite v1

Contrato report-only para derivar foco/navegacao sequencial minima a partir de `UiSystemReport v1`:

- ver `docs/UI_NAVIGATION_FOCUS_LITE_V1.md`.
- schema formal: `docs/schemas/ui-navigation-focus-report-v1.schema.json`.
- runtime: `buildUiNavigationFocusReportV1(sceneOrPath)`.
- CLI: `inspect-ui-navigation-focus <scene> [--json]`.
- MCP: `inspect_ui_navigation_focus({ path })`.
- o report usa `scopePolicy: "topmost-active-screen"` e escolhe uma unica screen ativa pela ordem canonica de `UiSystemReport v1`.
- candidatos v1 sao widgets `label` folha da screen focada, em pre-ordem, com `previousCandidateWidgetId` e `nextCandidateWidgetId`.
- warnings tornam explicitos os limites atuais: sem screen ativa, sem candidatos, geometria parcial e ausencia de semantica de acao.
- nao altera `ui.screen`, `UiSystemReport v1`, Browser Demo, Simple HTML Export, Portable HTML Export, `RenderSnapshot v1`, loop, replay, save/load, HUD Lite ou Playable Save/Load Lite.
- nao adiciona componente `ui.navigation`, widgets interativos, binding, ordem de foco autorada, ativacao, input de UI, estado persistido, editor ou consumo visual.

## UI Action Semantics Lite v1

Contrato autorado/report-only para declarar quais widgets de `ui.screen` sao acionaveis e qual foco inicial deve ser usado na scope ativa:

- ver `docs/UI_ACTION_SEMANTICS_LITE_V1.md`.
- shape formal do componente: `schemas/component.schema.json`.
- schema formal do report: `docs/schemas/ui-action-semantics-report-v1.schema.json`.
- componente: `ui.action.semantics` v1.
- runtime: `buildUiActionSemanticsReportV1(sceneOrPath)`.
- CLI: `inspect-ui-action-semantics <scene> [--json]`.
- MCP: `inspect_ui_action_semantics({ path })`.
- o componente e opt-in, nao replicado e deve compartilhar entidade com `ui.screen`.
- `fields.screenId` deve ser string nao vazia e igual ao `screenId` do `ui.screen` co-localizado.
- `fields.actions` deve ser array nao vazio de `{ widgetId, actionId }`, com ambos os ids unicos dentro do componente.
- `widgetId` so pode apontar para widgets `label` folha da arvore declarada no `ui.screen` co-localizado.
- `fields.initialFocusWidgetId`, quando presente, deve referenciar um `widgetId` declarado em `actions`.
- o report usa `scopePolicy: "topmost-active-screen"` e lista apenas `actions[]` da screen ativa do topo, sem mutar `UiNavigationFocusReport v1`.
- Browser Demo, Simple HTML Export e Portable HTML Export permanecem passivos neste slice.
- nao altera `RenderSnapshot v1`, loop, replay, save/load, HUD Lite ou Playable Save/Load Lite.

## UI Local Screen State Lite v1

Contrato report-only para explicitar estado local minimo de telas a partir dos contratos de UI ja existentes:

- ver `docs/UI_LOCAL_SCREEN_STATE_LITE_V1.md`.
- schema formal: `docs/schemas/ui-local-screen-state-report-v1.schema.json`.
- runtime: `buildUiLocalScreenStateReportV1(sceneOrPath)`.
- CLI: `inspect-ui-local-screen-state <scene> [--json]`.
- MCP: `inspect_ui_local_screen_state({ path })`.
- o report deriva de `UiSystemReport v1`, `UiNavigationFocusReport v1` e `UiActionSemanticsReport v1`.
- `scopePolicy` continua `topmost-active-screen`.
- `focusResolutionPolicy` v1 usa `ui.action.semantics` antes de `UiNavigationFocusReport v1`.
- `screens[]` preserva a ordem canonica de `UiSystemReport v1` e adiciona `localState`, `inActiveStack`, `stackIndex`, `candidateCount`, `actionCount` e foco resolvido por screen.
- `localState` v1 usa apenas `inactive`, `active-background` e `active-scope`.
- nao adiciona componente novo de cena, nao altera `ui.screen` v1 e nao muta `UiNavigationFocusReport v1` ou `UiActionSemanticsReport v1`.
- Browser Demo, Simple HTML Export e Portable HTML Export permanecem passivos neste slice.
- nao altera `RenderSnapshot v1`, loop, replay, save/load, HUD Lite ou Playable Save/Load Lite.

## UI Input Step Lite v1

Contrato report-only para derivar um passo local minimo de navegacao/ativacao de UI a partir de input ja validado:

- ver `docs/UI_INPUT_STEP_LITE_V1.md`.
- schema formal: `docs/schemas/ui-input-step-report-v1.schema.json`.
- runtime: `buildUiInputStepReportV1(sceneOrPath, { inputIntent })`.
- CLI: `inspect-ui-input-step <scene> --input-intent <path> [--json]`.
- MCP: `inspect_ui_input_step({ path, inputIntentPath })`.
- o report deriva de `InputIntent v1`, `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1`.
- `attemptedMove` agrega todas as actions `move` do input e `direction` colapsa o resultado para `-1 | 0 | 1`.
- `stepType` v1 usa `focus`, `focus-move`, `activate` e `noop` para tornar o passo local inspecionavel sem mutar cena ou runtime canonico.
- `move == 0` pode resultar em `activate` apenas dentro deste report local; isso nao redefine a semantica canonica de `InputIntent v1`.
- nao altera `UiSystemReport v1`, `UiNavigationFocusReport v1`, `UiActionSemanticsReport v1`, `UiLocalScreenStateReport v1`, loop, replay, save/load, Browser Demo, Simple HTML Export ou Portable HTML Export.
- permanece como superficie compativel baseada em `InputIntent v1`; novos passos locais de UI devem preferir `UiExplicitInput v1`.
- nao adiciona widgets interativos amplos, mouse/touch, hit-testing, persistencia de foco ou consumo interativo de UI.

## UI Explicit Input Lite v1

Contrato externo e versionado para separar input UI explicito de `InputIntent v1`:

- ver `docs/UI_EXPLICIT_INPUT_LITE_V1.md`.
- schema formal: `docs/schemas/ui-explicit-input-v1.schema.json`.
- runtime: `validateUiExplicitInputV1(input)` e `validateUiExplicitInputV1File(path)`.
- runtime auxiliar: `createUiExplicitInputFromKeyboardV1({ tick, keys })`.
- CLI: `validate-ui-explicit-input <path> [--json]`.
- CLI auxiliar: `keyboard-to-ui-explicit-input --tick <n> --keys <comma-list> [--json]`.
- MCP: `validate_ui_explicit_input({ path })`.
- MCP auxiliar: `keyboard_to_ui_explicit_input({ tick, keys })`.
- payload v1 usa `uiExplicitInputVersion`, `tick` e uma unica `action`.
- `action.type` pode ser `navigate` ou `activate`.
- `navigate` exige `direction: "previous" | "next"`.
- `activate` nao aceita `direction`.
- nao possui `entityId`, `screenId`, `widgetId` ou `actionId`; foco/scope continuam derivados dos reports de UI.
- nao altera `InputIntent v1`, loop, replay, save/load, Browser Demo, Simple HTML Export ou Portable HTML Export.

## UI Explicit Input Step Lite v1

Contrato report-only para derivar um passo local de UI a partir de `UiExplicitInput v1`:

- ver `docs/UI_EXPLICIT_INPUT_STEP_LITE_V1.md`.
- schema formal: `docs/schemas/ui-explicit-input-step-report-v1.schema.json`.
- runtime: `buildUiExplicitInputStepReportV1(sceneOrPath, { uiExplicitInput })`.
- CLI: `inspect-ui-explicit-input-step <scene> --ui-explicit-input <path> [--json]`.
- MCP: `inspect_ui_explicit_input_step({ path, uiExplicitInputPath })`.
- o report deriva de `UiExplicitInput v1`, `UiActionSemanticsReport v1` e `UiLocalScreenStateReport v1`.
- `navigate next` vira `direction: 1`, `navigate previous` vira `direction: -1` e `activate` vira `direction: 0`.
- foco, candidatos, boundary warnings e ativacao reutilizam a mesma logica pura de `UiInputStepReport v1`.
- nao inclui `inputIntentEntityId` nem `attemptedMove`.
- Browser Demo, Simple HTML Export e Portable HTML Export permanecem passivos neste slice.

## Sprite Animation v1

Contrato declarativo minimo para animacao sprite inspecionavel:

- ver `docs/SPRITE_ANIMATION_V1.md`.
- componente: `visual.sprite.animation` v1.
- runtime: `buildSpriteAnimationReportV1(sceneOrPath)`.
- CLI: `inspect-sprite-animation <scene> [--json]`.
- MCP: `inspect_sprite_animation({ path })`.
- report: `SpriteAnimationReport v1`.
- o runtime headless gera apenas report deterministico; nao avanca frame, nao altera drawCalls e nao toca o `run-loop`.
- `assetId` de animacao deve apontar para asset usado por algum `visual.sprite` da cena; referencias ausentes entram em `warnings` e `invalidRefs`.
- Browser Demo: `render-browser-demo --asset-manifest <path> --sprite-animation` ou `render_browser_demo({ assetManifestPath, spriteAnimation: true })` embute `metadata.spriteAnimation` e anima drawCalls `sprite` asset-backed por crop local de sprite-sheet.
- sem opt-in, a Browser Demo nao embute `metadata.spriteAnimation`.
- sem `assetManifestPath` ou sem drawCalls `sprite` asset-backed, a Browser Demo preserva o fallback visual atual mesmo com metadata embutida.
- nao altera `RenderSnapshot v1`, Simple HTML Export, Audio Lite, Movement Blocking, Tile Collision, InputIntent ou Save/Load.
- Simple HTML Export v1 continua sem consumo visual de Sprite Animation neste slice; esse consumo agora vive no contrato separado `Portable HTML Export v2`.
- nao e animation graph, timeline, skeletal animation, blending, atlas pipeline, editor ou renderer sprite completo.

## State Model v1 (interno)

Representação estruturada de estado inicial derivada do Scene Document v1:

- ver `docs/STATE_MODEL_V1.md`.

Regras:

- interno ao runtime;
- permite evolução futura além de `finalState` numérico;
- não altera contratos v1 já publicados.

## State Snapshot v1 (opt-in)

Contrato serializável de inspeção de estado:

- ver `docs/STATE_SNAPSHOT_V1.md`.
- schema formal: `docs/schemas/state-snapshot-v1.schema.json`.

Compatibilidade:

- não altera `LoopReport v1`;
- não altera `LoopTrace v1`;
- não altera `ExecutionPlan v1`;
- não altera `SceneValidationReport v1`;
- não altera `run-loop`/`run_loop` padrão.

## Component Registry v1 (interno)

Catálogo de componentes conhecidos para State Model v1:

- ver `docs/COMPONENT_REGISTRY_V1.md`.
- schema formal: `docs/schemas/component-registry-v1.schema.json`.

Componentes iniciais:

- `transform` v1;
- `velocity` v1.
- `visual.sprite` v1.
- `visual.sprite.animation` v1.
- `tile.layer` v1.
- `camera.viewport` v1.
- `collision.bounds` v1.
- `ui.screen` v1.
- `audio.clip` v1.

## State Processor Registry v1 (interno, opt-in)

Catálogo de processadores de estado para simulação opt-in:

- ver `docs/STATE_PROCESSOR_REGISTRY_V1.md`.
- schema formal: `docs/schemas/state-processor-registry-v1.schema.json`.

Processador inicial:

- `movement.integrate`.

Regras:

- não altera `Loop Scheduler v1`;
- não altera `System Registry v1`;
- não altera `run-loop` padrão.

## State Simulation Report v1 (opt-in)

Contrato de saída da simulação de estado:

- ver `docs/STATE_SIMULATION_REPORT_V1.md`.
- schema formal: `docs/schemas/state-simulation-report-v1.schema.json`.

Compatibilidade:

- independente de `LoopReport v1`;
- não altera `LoopTrace v1`;
- não altera `ExecutionPlan v1`.

## State Mutation Trace v1 (opt-in)

Contrato de diagnóstico de mutações por tick/processador da simulação de estado:

- ver `docs/STATE_MUTATION_TRACE_V1.md`.
- schema formal: `docs/schemas/state-mutation-trace-v1.schema.json`.

Compatibilidade:

- complementar ao `StateSimulationReport v1`;
- não altera contratos v1 existentes.

## Execution plan v1 (planejamento sem execução)

Contrato público interno para planejar ordem de execução do loop sem rodar handlers:

- ver `docs/EXECUTION_PLAN_V1.md`.
- schema formal: `docs/schemas/execution-plan-v1.schema.json`.

Separação explícita:

- `SceneValidationReport v1`: validação prévia;
- `ExecutionPlan v1`: planejamento de ticks/systems e estimativa;
- `LoopReport v1`: resultado real após execução;
- `LoopTrace v1`: diagnóstico real por tick/system;
- `System Registry v1`: base de systems conhecidos para metadados/deltas.

## Loop Scheduler v1 (interno)

Fonte interna única da ordem por tick usada por:

- `ExecutionPlan v1`;
- `LoopReport v1` (via execução);
- `LoopTrace v1`.

Referência: `docs/LOOP_SCHEDULER_V1.md`.

Regra atual:

- ordem de systems por tick segue exatamente a ordem declarada na scene;
- sem fases/prioridades nesta versão.

## Phased Scheduler Preview v1 (interno, opt-in)

Preview interno que anota phase por system sem alterar ordem real do scheduler:

- derivado de `Loop Scheduler v1` + `System Phase Registry v1`;
- não substitui o scheduler real;
- não altera contratos públicos v1.

## Governança de contratos

Evolução controlada v1 -> v2:

- ver `docs/CONTRACT_GOVERNANCE.md`.
- mudanças incompatíveis exigem novo contrato versionado, sem mutar v1 em-place.

## System Registry v1 (fonte de verdade de systems mínimos)

Contrato público interno para catalogar os systems mínimos conhecidos do loop headless:

- ver `docs/SYSTEM_REGISTRY_V1.md`.
- schema formal: `docs/schemas/system-registry-v1.schema.json`.

## System Phase Registry v1 (metadata interna de classificação)

Classificação lógica de phases para systems conhecidos, sem reorganizar execução nesta versão:

- ver `docs/SYSTEM_PHASE_REGISTRY_V1.md`.
- schema formal: `docs/schemas/system-phase-registry-v1.schema.json`.

Regras:

- `System Registry v1` continua fonte de verdade de `name`/`delta`/`deterministic`;
- `Loop Scheduler v1` continua fonte de verdade para ordem real por tick;
- `System Phase Registry v1` não altera ordem de execução em v1.

## Loop trace headless (diagnóstico opt-in)

Contrato opt-in de diagnóstico por tick/system:

- ver `docs/LOOP_TRACE_V1.md`.
- schema formal: `docs/schemas/loop-trace-v1.schema.json`.

Regra de compatibilidade:

- `LoopReport v1` permanece o contrato estável de resultado;
- habilitar trace não altera shape nem semântica do report padrão.

## Save versioning (política operacional mínima)

- `saveVersion: 1` é a única versão atualmente suportada.
- Versões diferentes falham de forma previsível no runtime/CLI/MCP.
- A falha é reportada em `$.saveVersion`.
- A mensagem atual é estável e usada pelos testes: `unsupported saveVersion: <valor>; supported: 1`.
- Ainda não existe migração automática de save.

## Minimal Save/Load v1

- Save/load real continua opt-in e mínimo: só acontece via runtime `saveStateSnapshotV1` / `loadStateSnapshotSaveV1`, CLI `save-state` / `load-save`, ou MCP `save_state_snapshot` / `load_save`.
- O payload salvo é um `State Snapshot v1` serializado em JSON canônico e determinístico.
- O envelope `savegame v1` preenche `saveVersion`, `contentVersion`, `seed`, `checksum` e `payloadRef`.
- `checksum` usa `sha256` sobre o payload canônico.
- `payloadRef` é resolvido relativo ao diretório do save e não pode escapar desse diretório.
- Load falha de forma previsível quando o envelope é inválido para `validateSaveFile`.
- Load falha de forma previsível quando o `checksum` diverge do payload salvo.
- Load falha de forma previsível quando o payload JSON está malformado.
- Sem usar save/load explicitamente, `run-loop`, `simulate-state`, `validate-save` e os demais comandos continuam com o mesmo comportamento padrão.
- Fora de escopo neste slice: persistência automática, autosave, editor e slots avançados.

## Simple HTML Export v1

Contrato de export simples para escrever uma cena jogavel pequena como arquivo HTML autocontido:

- ver `docs/SIMPLE_HTML_EXPORT_V1.md`.
- CLI: `export-html-game <scene> --out <file> [--movement-blocking] [--gameplay-hud] [--playable-save-load] [--audio-lite] [--ui-system] [--json]`.
- MCP: `export_html_game({ scenePath, outputPath, movementBlocking?, gameplayHud?, playableSaveLoad?, audioLite?, uiSystem? })`.
- Runtime: `buildHtmlGameExportV1(sceneOrPath, options)` e `exportHtmlGameV1(sceneOrPath, options)`.
- reutiliza Browser Playable Demo v1, `RenderSnapshot v1` e os envelopes internos ja existentes de blocking/HUD/save-load local.
- retorna envelope `exportVersion`, `scene`, `outputPath`, `options`, `sizeBytes` e `htmlHash`.
- nao inclui o HTML no envelope; o conteudo fica no arquivo escrito.
- nao altera Browser Demo Local State v1, Save/Load v1, RenderSnapshot v1, InputIntent v1 ou reports de colisao.
- nao e bundler, servidor, editor, build pipeline V2, asset copier ou runtime canonico de gameplay.

## Portable HTML Export v2

Contrato versionado para escrever HTML jogavel portatil com assets inline e consumo visual de Sprite Animation v1 ou Atlas/Material Manifest v1 sprite-only:

- ver `docs/PORTABLE_HTML_EXPORT_V2.md`.
- schema formal do envelope escrito: `docs/schemas/portable-html-export-v2.schema.json`.
- CLI: `export-portable-html-game <scene> --out <file> [--asset-manifest <file>] [--atlas-material-manifest <file>] [--movement-blocking] [--gameplay-hud] [--playable-save-load] [--audio-lite] [--sprite-animation] [--ui-system] [--json]`.
- MCP: `export_portable_html_game({ scenePath, outputPath, assetManifestPath?, atlasMaterialManifestPath?, movementBlocking?, gameplayHud?, playableSaveLoad?, audioLite?, spriteAnimation?, uiSystem? })`.
- Runtime: `buildPortableHtmlGameExportV2(sceneOrPath, options)` e `exportPortableHtmlGameV2(sceneOrPath, options)`.
- reutiliza `RenderSnapshot v1`, Browser Playable Demo v1 e `Sprite Animation v1` sem alterar os contratos v1.
- com `assetManifestPath`, drawCalls `sprite` recebem `assetSrc` inline como `data:` URL.
- com `atlasMaterialManifestPath`, sprites atlas-backed por `atlasBindingId` recebem `assetSrc` inline como `data:` URL e source rect em metadata interna.
- `assetManifestPath` e `atlasMaterialManifestPath` sao mutuamente exclusivos.
- extensoes inline suportadas neste slice: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.svg`.
- se um sprite do manifesto apontar para extensao fora dessa lista, runtime/CLI/MCP falham de forma previsivel no contrato v2 sem mutar `Asset Manifest v1`.
- com `spriteAnimation`, o HTML exportado pode animar sprite-sheets embutidos localmente.
- `spriteAnimation` e `atlasMaterialManifestPath` nao se compoem neste slice.
- sem `assetManifestPath`, o fallback visual atual permanece.
- sem `assetManifestPath`, `spriteAnimation` pode permanecer no metadata, mas os drawCalls continuam no fallback atual `rect`, sem `data:` URL inline e sem `file:///`.
- sem `assetManifestPath`, se a cena nao tiver qualquer componente visual renderizavel e o snapshot final ficar com `drawCalls: []`, `spriteAnimation` permanece no-op completo: metadata pode existir com arrays vazios, `embeddedAssetCount` fica `0` e o HTML preserva `drawCalls` vazios, sem `data:` URL inline e sem `file:///`.
- mesmo com `assetManifestPath`, se a cena nao produzir drawCalls `sprite` asset-backed compativeis, `spriteAnimation` permanece no-op visual: metadata pode existir, `embeddedAssetCount` fica `0` e o HTML segue em fallback `rect`, sem `data:` URL inline e sem `file:///`.
- mesmo com `assetManifestPath`, se a cena nao produzir drawCalls `sprite` asset-backed compativeis e tambem nao declarar `visual.sprite.animation` (ex.: `sprite` legado), `spriteAnimation` permanece no-op completo: metadata pode existir com `animations: []`, `warnings: []` e `invalidRefs: []`, `embeddedAssetCount` fica `0` e o HTML segue em fallback `rect`, sem `data:` URL inline e sem `file:///`.
- mesmo com `assetManifestPath`, se a cena for puramente `rect` e nao tiver qualquer componente de sprite (ex.: `tile.layer` sem `sprite`, `visual.sprite` ou `visual.sprite.animation`), `spriteAnimation` permanece no-op completo: metadata pode existir com arrays vazios, `embeddedAssetCount` fica `0` e o HTML preserva apenas drawCalls `rect`, sem `data:` URL inline e sem `file:///`.
- mesmo com `assetManifestPath`, se a cena nao tiver qualquer componente visual renderizavel e o snapshot final ficar com `drawCalls: []`, `spriteAnimation` permanece no-op completo: metadata pode existir com arrays vazios, `embeddedAssetCount` fica `0` e o HTML preserva `drawCalls` vazios, sem `data:` URL inline e sem `file:///`.
- mesmo com `assetManifestPath`, se a cena tiver `visual.sprite` asset-backed mas nao declarar `visual.sprite.animation`, `spriteAnimation` permanece no-op de animacao: metadata pode existir com `animations: []`, `embeddedAssetCount` continua contando os sprites inline e o HTML preserva drawCalls `sprite` normais, sem `file:///`.
- `Simple HTML Export v1` continua sem consumo visual de Sprite Animation ou Atlas/Material Manifest neste slice; a evolucao acontece no contrato v2 separado.
- nao e bundler, servidor, atlas pipeline, editor ou runtime canonico amplo de gameplay.

## Game Templates v1

Contrato leve de conteudo para exemplos V1 Small 2D copiar-e-adaptar:

- ver `docs/GAME_TEMPLATES_V1.md`.
- templates atuais: `templates/top-down-basic` e `templates/side-view-blocking-basic`.
- cada template contem `scene.json`, `README.md` e intents de exemplo em `input/`.
- reutiliza Scene Document v1, InputIntent v1, Browser Playable Demo v1 e Simple HTML Export v1.
- nao adiciona schema novo, runtime novo, comando novo ou tool MCP nova.
- nao exige `entity.prefab`; os templates continuam validos mesmo com o Prefab System v1 opcional.
- nao altera RenderSnapshot v1, Browser Demo Local State v1, MovementBlockingReport v1, TileCollisionReport v1 ou Save/Load v1.
- nao e template engine, prefab system, editor, UI system, fisica, pathfinding, audio, animation ou platformer real.

## Prefab System v1

Contrato minimo para resolver `entity.prefab` a partir de um arquivo declarativo local:

- ver `docs/PREFAB_SYSTEM_V1.md`.
- ver `docs/PREFAB_VALIDATION_REPORT_V1.md`.
- schema formal do prefab: `schemas/prefab.schema.json`.
- schema formal do report de validacao: `docs/schemas/prefab-validation-report-v1.schema.json`.
- schema formal do report: `docs/schemas/prefab-usage-report-v1.schema.json`.
- runtime: `buildPrefabValidationReportV1(path)`.
- CLI: `validate-prefab <path> [--json]`.
- MCP: `validate_prefab({ path })`.
- runtime: `loadSceneFile(path)` resolve prefabs em chamadas por path.
- runtime: `buildPrefabUsageReportV1(path)`.
- runtime: `buildPrefabUsageReportV2(path)`.
- CLI: `inspect-prefab-usage <scene> [--json]`.
- CLI: `inspect-prefab-usage-v2 <scene> [--json]`.
- MCP: `inspect_prefab_usage({ path })`.
- MCP: `inspect_prefab_usage_v2({ path })`.
- entidade com `prefab` pode omitir `components` quando nao precisa override local.
- `entity.prefab` deve permanecer path relativo seguro e apontar para `.prefab.json`; refs com traversal, URL, path absoluto/UNC ou extensao diferente falham de forma previsivel.
- merge: componentes do prefab entram primeiro, componentes da entidade sobrescrevem por `kind`, extras da entidade entram ao final.
- `validateSceneFile`, `RenderSnapshot v1`, Render SVG, SVG Demo HTML, Canvas2D Demo, Simple HTML Export, Portable HTML Export, reports de colisao, Browser Demo e demais fluxos por path passam a consumir a cena resolvida ou falhar de forma previsivel antes do consumo visual.
- cenas sem `entity.prefab` permanecem iguais.
- objetos de cena em memoria continuam sem resolucao automatica de prefab neste slice.
- nao e nested prefab, prefab hierarchy, hot reload, editor, template engine, UI system formal ou pipeline de authoring.

## Prefab Usage Report v2

Contrato opt-in para rastrear composicao de prefab por path/origem/override sem mutar `PrefabUsageReport v1`:

- ver `docs/PREFAB_USAGE_REPORT_V2.md`.
- schema formal: `docs/schemas/prefab-usage-report-v2.schema.json`.
- runtime: `buildPrefabUsageReportV2(path)`.
- CLI: `inspect-prefab-usage-v2 <scene> [--json]`.
- MCP: `inspect_prefab_usage_v2({ path })`.
- adiciona `absolutePath` da cena, `entityPath`, `prefabAbsolutePath`, `sourceComponentPath`, `resolvedComponentPath` e `overrides[]`.
- `inspect-prefab-usage` / `inspect_prefab_usage` permanecem em `PrefabUsageReport v1`.
- nao e nested prefab, nao resolve prefabs em objetos de cena em memoria e nao altera `RenderSnapshot v1`.

## V1 Small 2D Game Creation Guide

Contrato operacional de workflow para criar jogos pequenos 2D a partir de Game Templates v1:

- ver `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`.
- pacote de prompt: `docs/codex-packages/V1_SMALL_2D_CREATE_GAME_PACKAGE.md`.
- checklist: `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`.
- exemplo documental: `docs/examples/V1_SMALL_2D_GAME_PLAN_EXAMPLE.md`.
- reutiliza `templates/top-down-basic` e `templates/side-view-blocking-basic`.
- reutiliza Scene Document v1, InputIntent v1, Browser Playable Demo v1, Browser Demo Local State v1 e Simple HTML Export v1.
- nao adiciona schema novo, runtime novo, comando CLI novo ou tool MCP nova.
- `entity.prefab` permanece opcional neste workflow; o guia nao exige prefab para criar jogos pequenos.
- HUD Lite e Playable Save/Load Lite continuam opt-ins locais do HTML, nao UI system ou savegame canonico.
- nao e template engine, prefab system, scaffolder obrigatorio, editor, UI system completo, fisica, gravidade, jump, pathfinding, combate, inventario, audio, animation, servidor, bundler ou build pipeline V2.

## V1 Small 2D Release Checkpoint

Contrato operacional de release para declarar a V1 Small 2D como release-checkpointed:

- ver `docs/V1_SMALL_2D_RELEASE_CHECKPOINT.md`.
- matriz de evidencias: `docs/V1_SMALL_2D_CAPABILITY_MATRIX.md`.
- validacao canonica: `docs/V1_SMALL_2D_RELEASE_VALIDATION.md`.
- nao adiciona schema novo, runtime novo, comando CLI novo ou tool MCP nova.
- nao altera Scene Document v1, RenderSnapshot v1, Browser Demo Local State v1, MovementBlockingReport v1, TileCollisionReport v1 ou Simple HTML Export v1.
- registra que a V1 fica aberta apenas para bugfix, hardening e compatibilidade.
- Audio Lite v1, UI System v1 visual opt-in, UI Production Screens v1, UI Navigation/Focus Lite v1 report-only, UI Action Semantics Lite v1 report-only, UI Local Screen State Lite v1 report-only, UI Input Step Lite v1 report-only, UI Explicit Input Lite v1, UI Explicit Input Step Lite v1, UI Regression Matrix v1, Sprite Animation v1, Portable HTML Export v2, Prefab System v1, Visual Regression Baseline v1, Scene Transition Report v1, Scene Composition Manifest v1, Pathfinding Grid v1, Atlas/Material Manifest v1, Atlas Region Consumption v1 sprite-only e Atlas Region Binding Contract v1 ja foram entregues como incrementos pequenos pos-checkpoint; `entity.prefab` v1 deve ficar congelado para bugfix/compatibilidade; o audit pequeno de lacunas V2 esta registrado em `docs/V2_GAP_AUDIT.md`; o proximo pacote recomendado e `Browser UI Input Preview v1`, restrito a Browser Demo e sem reabrir exports.
