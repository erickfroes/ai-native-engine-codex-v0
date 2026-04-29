# V1 Small 2D Release Validation

Este documento define a sequencia canonica para validar o checkpoint V1 Small 2D.

## Baseline Do Repositorio

```bash
npm test
npm run validate:scenes
npm run smoke
```

## Cena Canonica

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs render-snapshot ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --out ./tmp/v1-small-2d-release.html --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./scenes/v1-small-2d.scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/v1-small-2d-release-full.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --out ./tmp/v1-small-2d-release-export.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./scenes/v1-small-2d.scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/v1-small-2d-release-export-full.html --json
```

## Gameplay Checks

```bash
node ./engine/runtime/src/cli.mjs inspect-collision-bounds ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-collision-overlaps ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-tile-collision ./scenes/v1-small-2d.scene.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./scenes/v1-small-2d.scene.json --input-intent ./fixtures/input/v1-small-2d-move-right.intent.json --json
node ./engine/runtime/src/cli.mjs inspect-movement-blocking ./scenes/v1-small-2d.scene.json --input-intent ./fixtures/input/v1-small-2d-move-down.intent.json --json
node ./engine/runtime/src/cli.mjs run-loop ./scenes/v1-small-2d.scene.json --ticks 1 --input-intent ./fixtures/input/v1-small-2d-move-right.intent.json --json
node ./engine/runtime/src/cli.mjs run-loop ./scenes/v1-small-2d.scene.json --ticks 1 --movement-blocking --input-intent ./fixtures/input/v1-small-2d-move-right.intent.json --json
```

Expectativas:

- movimento para direita e bloqueado quando `movementBlocking` esta ativo;
- movimento para baixo permanece livre;
- sem `movementBlocking`, o comportamento padrao continua preservado;
- reports permanecem deterministicos para o mesmo input.

## Templates

```bash
node ./engine/runtime/src/cli.mjs validate-scene ./templates/top-down-basic/scene.json --json
node ./engine/runtime/src/cli.mjs validate-scene ./templates/side-view-blocking-basic/scene.json --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./templates/top-down-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/top-down-basic-release.html --json
node ./engine/runtime/src/cli.mjs render-browser-demo ./templates/side-view-blocking-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/side-view-blocking-basic-release.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./templates/top-down-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/top-down-basic-release-export.html --json
node ./engine/runtime/src/cli.mjs export-html-game ./templates/side-view-blocking-basic/scene.json --movement-blocking --gameplay-hud --playable-save-load --out ./tmp/side-view-blocking-basic-release-export.html --json
```

## HTML Proibido

O HTML gerado pelos fluxos canonicos de Browser Demo ou Simple HTML Export, sem Asset Manifest externo, nao deve conter:

- `fetch`;
- `localStorage`;
- `sessionStorage`;
- `IndexedDB`;
- `Date.now`;
- `new Date`;
- `performance.now`;
- scripts externos;
- `import(`;
- `link href` externo.

Observacao: `render-browser-demo --asset-manifest` pode materializar `file:///...` para preview local de imagens. Esse caminho continua deterministico e local, mas nao e export portavel de assets.

## Aceitacao Manual Recomendada

Para checkpoint humano, alem dos comandos automatizados:

- abra o HTML default diretamente no navegador;
- confirme que o canvas recebe foco e aceita input local;
- abra o HTML com `--movement-blocking --gameplay-hud --playable-save-load`;
- confirme que movimento para direita e bloqueado e movimento para baixo e livre;
- confirme que o HUD Lite atualiza `blocked moves`, `last input` e `last result`;
- use `Export State`, altere a posicao local, depois use `Import State` e confirme o round-trip;
- confirme que nao ha servidor local, rede, storage persistente ou scripts externos.

## Budgets Simples

Trate estes limites como teto V1 para exemplos pequenos, nao como meta para crescer a cena.

| Alvo | DrawCalls | Blockers solidos | Export full |
| --- | ---: | ---: | ---: |
| `scenes/v1-small-2d.scene.json` | ate 32 | ate 8 | ate 32000 B |
| `templates/top-down-basic/scene.json` | ate 64 | ate 32 | ate 32000 B |
| `templates/side-view-blocking-basic/scene.json` | ate 32 | ate 16 | ate 32000 B |

Baselines atuais conhecidos:

- `v1-small-2d`: 23 drawCalls, 1 tile solido e export full em torno de 26800 B.
- `top-down-basic`: 50 drawCalls, 25 tiles solidos e export full em torno de 30597 B.
- `side-view-blocking-basic`: 15 drawCalls, 11 tiles solidos e export full em torno de 26774 B.

## Dependencias

Este checkpoint nao adiciona dependencia npm nova.

Se um pacote futuro criar script agregador de release, ele deve continuar chamando os comandos existentes e nao substituir a validacao explicita por cena/template.
