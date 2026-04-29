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

Contrato público interno para validação de cena antes da execução do loop:

- ver `docs/SCENE_VALIDATION_REPORT_V1.md`.
- schema formal: `docs/schemas/scene-validation-report-v1.schema.json`.

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

## Visual Components v1 (declarativo)

Contrato minimo para componentes visuais declarados na propria cena:

- ver `docs/VISUAL_COMPONENTS_V1.md`.
- componentes atuais: `visual.sprite` v1 e `tile.layer` v1.

Compatibilidade:

- declarativo e opt-in;
- sem `Asset Manifest v1`, o render continua com fallback `rect`;
- com `Asset Manifest v1`, `visual.sprite.fields.assetId` pode gerar drawCall `sprite` com `assetSrc`;
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
- sem essas flags/opcoes, Browser Playable Demo permanece igual;
- `InputIntent v1`, `KeyboardInputScript v1`, RenderSnapshot v1, Save/Load v1 e renderers permanecem inalterados;
- nao adiciona UI system completo, fisica completa, resolucao complexa, pathfinding, editor ou servidor.

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
- `tile.layer` v1.
- `camera.viewport` v1.

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
- CLI: `export-html-game <scene> --out <file> [--movement-blocking] [--gameplay-hud] [--playable-save-load] [--json]`.
- MCP: `export_html_game({ scenePath, outputPath, movementBlocking?, gameplayHud?, playableSaveLoad? })`.
- Runtime: `buildHtmlGameExportV1(sceneOrPath, options)` e `exportHtmlGameV1(sceneOrPath, options)`.
- reutiliza Browser Playable Demo v1, `RenderSnapshot v1` e os envelopes internos ja existentes de blocking/HUD/save-load local.
- retorna envelope `exportVersion`, `scene`, `outputPath`, `options`, `sizeBytes` e `htmlHash`.
- nao inclui o HTML no envelope; o conteudo fica no arquivo escrito.
- nao altera Browser Demo Local State v1, Save/Load v1, RenderSnapshot v1, InputIntent v1 ou reports de colisao.
- nao e bundler, servidor, editor, build pipeline V2, asset copier ou runtime canonico de gameplay.

## Game Templates v1

Contrato leve de conteudo para exemplos V1 Small 2D copiar-e-adaptar:

- ver `docs/GAME_TEMPLATES_V1.md`.
- templates atuais: `templates/top-down-basic` e `templates/side-view-blocking-basic`.
- cada template contem `scene.json`, `README.md` e intents de exemplo em `input/`.
- reutiliza Scene Document v1, InputIntent v1, Browser Playable Demo v1 e Simple HTML Export v1.
- nao adiciona schema novo, runtime novo, comando novo ou tool MCP nova.
- nao usa `entity.prefab` como semantica de runtime.
- nao altera RenderSnapshot v1, Browser Demo Local State v1, MovementBlockingReport v1, TileCollisionReport v1 ou Save/Load v1.
- nao e template engine, prefab system, editor, UI system, fisica, pathfinding, audio, animation ou platformer real.

## V1 Small 2D Game Creation Guide

Contrato operacional de workflow para criar jogos pequenos 2D a partir de Game Templates v1:

- ver `docs/V1_SMALL_2D_GAME_CREATION_GUIDE.md`.
- pacote de prompt: `docs/codex-packages/V1_SMALL_2D_CREATE_GAME_PACKAGE.md`.
- checklist: `docs/V1_SMALL_2D_GAME_CREATION_CHECKLIST.md`.
- exemplo documental: `docs/examples/V1_SMALL_2D_GAME_PLAN_EXAMPLE.md`.
- reutiliza `templates/top-down-basic` e `templates/side-view-blocking-basic`.
- reutiliza Scene Document v1, InputIntent v1, Browser Playable Demo v1, Browser Demo Local State v1 e Simple HTML Export v1.
- nao adiciona schema novo, runtime novo, comando CLI novo ou tool MCP nova.
- `entity.prefab` permanece reservado/fora deste workflow; o guia nao define semantica de prefab.
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
- proximo pacote recomendado: `codex/audio-lite-v1`.
