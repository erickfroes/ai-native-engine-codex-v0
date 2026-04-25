# Browser Playable Demo v1

## Objetivo

Definir uma demo interativa minima, estatica e autocontida no browser, derivada de `RenderSnapshot v1`, usando Canvas 2D nativo e sem Node runtime no cliente.

## Runtime

- `renderBrowserPlayableDemoHtmlV1({ title, renderSnapshot, metadata })` retorna um HTML completo, estatico e deterministico.
- `renderSnapshot` continua sendo exatamente `RenderSnapshot v1`.
- `createBrowserPlayableDemoMetadataV1(scene, renderSnapshot, overrides?)` escolhe o rect controlavel pela ordem original das entidades da cena; se isso falhar, o HTML faz fallback deterministicamente para o primeiro rect do snapshot.
- `metadata.controllableEntityId` pode fixar o rect controlavel quando necessario.
- `metadata.stepPx` define o passo fixo por input; o default atual e `4`.

## Comportamento

- desenha `drawCalls` com `kind: "rect"` em um unico `canvas`;
- captura teclado real via `keydown` no proprio `canvas`;
- o `canvas` precisa estar com foco para receber input; o HTML tenta focar no load e volta a focar no clique;
- usa a convencao compativel com `InputIntent v1`:
  - `ArrowRight` ou `KeyD` -> `x +1`
  - `ArrowLeft` ou `KeyA` -> `x -1`
  - `ArrowUp` ou `KeyW` -> `y -1`
  - `ArrowDown` ou `KeyS` -> `y +1`
- aplica `4 px` por keydown valido;
- faz redraw logo apos cada input valido;
- se a entidade controlavel configurada nao existir, faz fallback deterministico para o primeiro rect do snapshot; se nao houver rect, a demo permanece sem alvo controlavel;
- nao importa o runtime Node no browser;
- nao faz fetch, rede, scripts externos ou dependencia de canvas libs;
- nao executa loop de jogo completo, tick continuo, systems de gameplay ou simulacao realtime do engine neste slice.

## CLI e MCP

- CLI: `render-browser-demo <scene> [--tick <n>] [--width <n>] [--height <n>] [--out <path>] [--json]`
- MCP: `render_browser_demo(path, tick?, width?, height?)`

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

## Fora de escopo

- nao e runtime jogavel completo do engine ainda;
- nao e editor;
- nao usa Pixi, Three ou WebGL;
- nao altera o loop headless;
- nao salva estado automaticamente;
- nao usa rede;
- nao usa assets reais;
- nao cria servidor web.
