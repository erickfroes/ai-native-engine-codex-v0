# Browser Playable Demo v1

## Objetivo

Definir uma demo interativa minima e autocontida no browser, derivada de `RenderSnapshot v1`, usando Canvas 2D nativo e sem Node runtime no cliente.

## Runtime

- `renderBrowserPlayableDemoHtmlV1({ title, renderSnapshot, metadata })` retorna um HTML completo e autocontido para os fluxos sem assets externos; com `assetManifestPath`, o conteudo continua deterministico para os mesmos inputs e o mesmo path absoluto do manifesto, mas referencia imagens locais via `file:///...` e cai para fallback `rect` se elas nao carregarem.
- `renderSnapshot` continua sendo exatamente `RenderSnapshot v1`.
- `createBrowserPlayableDemoMetadataV1(scene, renderSnapshot, overrides?)` escolhe o rect controlavel pela ordem original das entidades da cena; se isso falhar, o HTML faz fallback deterministicamente para o primeiro rect do snapshot.
- `metadata.controllableEntityId` pode fixar o rect controlavel quando necessario.
- `metadata.stepPx` define o passo fixo por input; o default atual e `4`.
- `metadata.movementBlocking` e um envelope interno opcional do HTML, gerado apenas quando o fluxo opt-in pede blocking local.
- `metadata.gameplayHud` e um envelope interno opcional do HTML, gerado apenas quando o fluxo opt-in pede HUD Lite local.
- `metadata.playableSaveLoad` e um envelope interno opcional do HTML, gerado apenas quando o fluxo opt-in pede Playable Save/Load Lite local.
- `metadata.audioLite` e um envelope interno opcional do HTML, gerado apenas quando o fluxo opt-in pede Audio Lite v1 diagnostico.
- o loop visual local usa `requestAnimationFrame` apenas para redraw continuo do estado atual.

## Comportamento

- desenha `drawCalls` em um unico `canvas`;
- draw calls `sprite` tentam `new Image()` com `assetSrc` quando presente e renderizam com `drawImage`.
- se `assetSrc` falhar por `Image.onerror` ou ainda estiver carregando no primeiro frame, a demo cai no fallback visual deterministico do `rect`;
- mantem um loop visual local de redraw no browser;
- o loop visual nao altera simulacao, tick, systems ou posicao por conta propria;
- captura teclado real via `keydown` no proprio `canvas`;
- o `canvas` permanece focavel com `tabindex="0"`; o HTML tenta focar no load e volta a focar no clique;
- o HTML expoe instrucoes locais estaveis para clique/foco e movimento por teclado;
- usa a convencao compativel com `InputIntent v1`:
  - `ArrowRight` ou `KeyD` -> `x +1`
  - `ArrowLeft` ou `KeyA` -> `x -1`
  - `ArrowUp` ou `KeyW` -> `y -1`
  - `ArrowDown` ou `KeyS` -> `y +1`
- aplica `4 px` por keydown valido;
- com `movementBlocking` opt-in, calcula uma posicao candidata antes de mover e bloqueia localmente se o bounds controlavel sobrepor `collision.bounds` solido ou tile solido de `tile.layer`;
- sem `movementBlocking`, o movimento local continua livre como antes;
- faz redraw continuo e tambem logo apos cada input valido;
- expoe controle local `Pause rendering` / `Resume rendering` para pausar ou retomar apenas o redraw loop;
- o botao `Reset` restaura a posicao inicial do snapshot e zera o contador local de inputs;
- com `gameplayHud` opt-in, exibe Browser Gameplay HUD Lite com entidade controlada, tick do snapshot, posicao atual, inputs locais, movimentos bloqueados, ultimo input, ultimo resultado, rendering `running/paused` e movement blocking `enabled/disabled`;
- sem `gameplayHud`, o HTML nao embute o bloco `browser-gameplay-hud` nem o payload `metadata.gameplayHud`;
- com `gameplayHud` e sem `movementBlocking`, `blocked moves` permanece `0` e o HUD mostra movement blocking `disabled`;
- com `gameplayHud` e `movementBlocking`, movimentos bloqueados incrementam `blocked moves` e mostram ultimo resultado `blocked`;
- com `playableSaveLoad` opt-in, exibe controles locais `Export State`, `Import State`, textarea JSON e mensagem curta de erro/importacao;
- o formato exportado e browser-local: `kind: "browser.playable-demo.local-state"`, `version: 1`, `sceneId`, `tick`, `controlledEntityId`, `positions`, `options` e, quando HUD esta ativo, `gameplayHud`;
- import restaura a posicao local do controlavel e atualiza o HUD quando ele esta ativo; se o JSON for invalido ou incompatível com a cena atual, a demo mostra erro curto e preserva o estado atual;
- com `audioLite` opt-in, embute metadata de `audio.clip` e controles diagnosticos locais `Enable Audio Lite` e `Trigger manual cue`;
- Audio Lite no browser nao forca autoplay; triggers so tentam emitir cue diagnostico apos gesto do usuario e usam fallback silencioso quando necessario;
- `Pause rendering`, `Resume rendering` e `Reset` sao controles locais do HTML autocontido e nao alteram contratos v1 publicados;
- se a entidade controlavel configurada nao existir, faz fallback deterministico para o primeiro rect do snapshot; se nao houver rect, a demo permanece sem alvo controlavel;
- nao importa o runtime Node no browser;
- nao usa `Date.now`, `new Date`, `performance.now`, `fetch`, rede, scripts externos, `link href`, `import(`, `localStorage`, `sessionStorage`, `IndexedDB` ou dependencia de canvas libs;
- nao executa loop de jogo completo, tick continuo, systems de gameplay ou simulacao realtime do engine neste slice.
- o blocking local da Browser Demo e diagnostico/interativo, nao substitui `run-loop` nem `MovementBlockingReport v1`.

## CLI e MCP

- CLI: `render-browser-demo <scene> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--movement-blocking] [--gameplay-hud] [--playable-save-load] [--audio-lite] [--out <path>] [--json]`
- MCP: `render_browser_demo(path, tick?, width?, height?, assetManifestPath?, movementBlocking?, gameplayHud?, playableSaveLoad?, audioLite?)`

Exemplo para gerar um arquivo HTML:

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/tutorial.scene.json --tick 4 --width 320 --height 180 --out ./tmp/tutorial-browser-demo.html
```

Exemplo com blocking local opt-in:

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./engine/runtime/test/fixtures/movement-blocking-tile-blocked.scene.json --movement-blocking --out ./tmp/tile-blocking-browser-demo.html --json
```

Exemplo com HUD Lite local opt-in na cena V1 Small 2D:

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --gameplay-hud --movement-blocking --out ./tmp/v1-small-2d-hud.html --json
```

Exemplo com Playable Save/Load Lite local opt-in:

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --gameplay-hud --movement-blocking --playable-save-load --out ./tmp/v1-small-2d-save-load.html --json
```

Exemplo com Audio Lite diagnostico opt-in:

```bash
node ./engine/runtime/src/cli.mjs render-browser-demo ./engine/runtime/test/fixtures/audio-lite-sfx.scene.json --audio-lite --out ./tmp/audio-lite-browser-demo.html --json
```

Depois de gerar com `--out`, abra o arquivo HTML diretamente no navegador. A demo sem `--asset-manifest` e autocontida: nao precisa de servidor local, assets reais ou runtime Node no cliente. Quando `--asset-manifest` e usado, o HTML continua single-file e deterministico, mas nao e portavel sozinho porque referencia imagens locais por `file:///...`; se o arquivo for movido sem os assets, o fallback `rect` preserva funcionamento basico.

Envelope minimo de CLI `--json` e MCP `structuredContent`:

```json
{
  "browserDemoVersion": 1,
  "scene": "tutorial",
  "tick": 4,
  "html": "<!DOCTYPE html>\n..."
}
```

No CLI, `outputPath` so aparece quando `--out` e usado.

### Movement Blocking Local

- `--movement-blocking` no CLI e `movementBlocking: true` no MCP embutem dados locais de blocking no HTML.
- os dados sao internos ao payload inline da demo e nao alteram `RenderSnapshot v1` nem o envelope publico `browserDemoVersion`.
- blockers de entidade usam `collision.bounds` solido.
- blockers de tile usam entries `rect` de `tile.layer.fields.palette` com `solid: true`.
- `camera.viewport` e respeitado porque os bounds embutidos usam a mesma coordenada de tela dos drawCalls renderizados.
- o resultado e deterministico para a mesma cena, snapshot, manifesto e opcoes.

### Browser Gameplay HUD Lite Local

- `--gameplay-hud` no CLI e `gameplayHud: true` no MCP embutem HUD Lite local no HTML.
- o HUD e diagnostico e browser-local; ele nao e um sistema de UI completo do engine.
- o HUD deriva apenas do snapshot, da entidade controlavel, do estado local de input e do metadata interno de blocking quando presente.
- `inputs local` conta movimentos aplicados; movimentos bloqueados ficam em `blocked moves`.
- `last result` usa valores simples: `idle`, `moved`, `blocked`, `ignored` ou `reset`.
- `rendering` mostra apenas o estado do redraw loop local (`running` ou `paused`), nao um tick de simulacao do engine.
- o HUD nao altera `RenderSnapshot v1`, `InputIntent v1`, `MovementBlockingReport v1`, `TileCollisionReport v1`, `run-loop` ou o envelope publico `browserDemoVersion`.

### Playable Save/Load Lite Local

- `--playable-save-load` no CLI e `playableSaveLoad: true` no MCP embutem controles locais de export/import no HTML.
- contrato do JSON local: `docs/BROWSER_PLAYABLE_DEMO_LOCAL_STATE_V1.md`.
- o estado exportado e local a pagina e nao e `savegame v1`.
- o formato minimo usa `kind: "browser.playable-demo.local-state"` e `version: 1`.
- `positions` salva apenas posicoes locais de entidades controladas pela demo; hoje o foco e a cena `scenes/v1-small-2d.scene.json`.
- `options` registra `movementBlocking`, `gameplayHud` e `playableSaveLoad` para rejeitar import incompatível com o HTML atual.
- quando `gameplayHud` esta ativo, `gameplayHud` salva `inputs`, `blockedMoves`, `lastInput` e `lastResult`.
- `Export State` escreve JSON deterministico no textarea local; `Import State` le esse textarea e restaura a posicao local.
- import com `movementBlocking` ativo rejeita posicoes bloqueadas por bounds/tile solido para preservar a regra local da demo.
- se nao houver entidade controlavel no snapshot, a demo nao renderiza os controles de Playable Save/Load Lite.
- nao usa `localStorage`, `sessionStorage`, `IndexedDB`, rede, disco, autosave, `save-state`, `load-save` ou `State Snapshot v1`.
- nao substitui Save/Load v1 existente; e apenas uma conveniencia jogavel e manual da Browser Playable Demo.

### Audio Lite Local

- `--audio-lite` no CLI e `audioLite: true` no MCP embutem metadata e controles diagnosticos de Audio Lite v1.
- o HTML lista clips/triggers declarados por `audio.clip` e expoe contadores locais de cues.
- o browser nao inicia audio no load; `onDemoStart` so e registrado apos o botao `Enable Audio Lite`.
- `onMove` e `onBlockedMove` sao registrados em keydowns locais quando ha clips declarados para esses triggers.
- `manual` pode ser acionado por `Trigger manual cue`.
- se `AudioContext` nao estiver disponivel ou for bloqueado, o HTML preserva fallback silencioso e o contador diagnostico.
- nao usa `fetch`, rede, storage, scripts externos, imports dinamicos ou autoplay forcado.

### Asset Manifest Local

- `render-browser-demo --asset-manifest <path>` e `render_browser_demo(assetManifestPath)` materializam `assetSrc` para `file:///...` local a partir do diretorio do manifesto.
- cenas com `visual.sprite.fields.assetId` usam o mesmo caminho local quando o manifesto e fornecido.
- o HTML de runtime faz carregamento local (`Image.src = assetSrc`) e `drawImage` quando a imagem estiver disponivel.
- se a imagem nao carregar, o fallback segue no `rect` e o demo continua funcional sem quebrar.
- no manifesto, `assets[].src` continua relativo por design; paths absolutos e traversal continuam proibidos.
- no HTML da browser demo, o `assetSrc` validado e resolvido para `file:///...` local.
- esse fluxo nao e asset bundling portavel; Simple HTML Export v1 tambem nao copia assets reais.

## Fora de escopo

- nao e runtime jogavel completo do engine ainda;
- nao e editor;
- nao usa Pixi, Three ou WebGL;
- nao usa backend grafico externo;
- nao altera o loop headless;
- nao salva estado automaticamente;
- nao usa `localStorage`;
- nao usa `sessionStorage` ou `IndexedDB`;
- nao usa rede;
- nao substitui `State Snapshot v1`, `savegame v1`, `save-state` ou `load-save`;
- nao cria/transforma pipeline de assets reais no runtime;
- nao cria servidor web.
- nao cria UI system completo, widgets declarativos, menus, layout engine ou HUD canonico de jogo.
