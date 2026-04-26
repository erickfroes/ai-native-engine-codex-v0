# Browser Playable Demo v1

## Objetivo

Definir uma demo interativa minima e autocontida no browser, derivada de `RenderSnapshot v1`, usando Canvas 2D nativo e sem Node runtime no cliente.

## Runtime

- `renderBrowserPlayableDemoHtmlV1({ title, renderSnapshot, metadata })` retorna um HTML completo, autocontido e deterministico.
- `renderSnapshot` continua sendo exatamente `RenderSnapshot v1`.
- `createBrowserPlayableDemoMetadataV1(scene, renderSnapshot, overrides?)` escolhe o rect controlavel pela ordem original das entidades da cena; se isso falhar, o HTML faz fallback deterministicamente para o primeiro rect do snapshot.
- `metadata.controllableEntityId` pode fixar o rect controlavel quando necessario.
- `metadata.stepPx` define o passo fixo por input; o default atual e `4`.
- o loop visual local usa `requestAnimationFrame` apenas para redraw continuo do estado atual.

## Comportamento

- desenha `drawCalls` em um unico `canvas`;
- draw calls `sprite` tentam `new Image()` com `assetSrc` quando presente e renderizam com `drawImage`.
- se `assetSrc` falhar ou ainda estiver carregando no primeiro frame, a demo cai no fallback visual deterministico do `rect`;
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
- faz redraw continuo e tambem logo apos cada input valido;
- expoe controle local `Pause rendering` / `Resume rendering` para pausar ou retomar apenas o redraw loop;
- o botao `Reset` restaura a posicao inicial do snapshot e zera o contador local de inputs;
- `Pause rendering`, `Resume rendering` e `Reset` sao controles locais do HTML autocontido e nao alteram contratos v1 publicados;
- se a entidade controlavel configurada nao existir, faz fallback deterministico para o primeiro rect do snapshot; se nao houver rect, a demo permanece sem alvo controlavel;
- nao importa o runtime Node no browser;
- nao usa `Date.now`, `new Date`, `performance.now`, `fetch`, rede, scripts externos, `localStorage` ou dependencia de canvas libs;
- nao executa loop de jogo completo, tick continuo, systems de gameplay ou simulacao realtime do engine neste slice.

## CLI e MCP

- CLI: `render-browser-demo <scene> [--tick <n>] [--width <n>] [--height <n>] [--asset-manifest <path>] [--out <path>] [--json]`
- MCP: `render_browser_demo(path, tick?, width?, height?, assetManifestPath?)`

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

### Asset Manifest Local

- `render-browser-demo --asset-manifest <path>` e `render_browser_demo(assetManifestPath)` ativam `assetSrc` deterministico no HTML.
- o HTML de runtime faz carregamento local (`Image.src = assetSrc`) e `drawImage` quando a imagem estiver disponível.
- se a imagem nao carregar, o fallback segue no `rect` e o demo continua funcional sem quebrar.
- caminhos de `assetSrc` seguem contrato seguro do Asset Manifest v1 e sao relativos por design.

## Fora de escopo

- nao e runtime jogavel completo do engine ainda;
- nao e editor;
- nao usa Pixi, Three ou WebGL;
- nao usa backend grafico externo;
- nao altera o loop headless;
- nao salva estado automaticamente;
- nao usa rede;
- nao cria/transforma pipeline de assets reais no runtime;
- nao cria servidor web.
