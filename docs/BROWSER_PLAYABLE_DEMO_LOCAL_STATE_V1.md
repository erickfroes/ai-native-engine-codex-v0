# Browser Playable Demo Local State v1

## Objetivo

Definir o formato pequeno usado apenas pelo Playable Save/Load Lite da Browser Playable Demo.

Este formato e browser-local, manual e orientado ao HTML gerado. Ele nao e `savegame v1`, nao substitui `State Snapshot v1` e nao passa por `save-state` ou `load-save`.

## Shape

```json
{
  "version": 1,
  "kind": "browser.playable-demo.local-state",
  "sceneId": "v1-small-2d",
  "tick": 0,
  "controlledEntityId": "player.hero",
  "positions": [
    {
      "entityId": "player.hero",
      "x": 0,
      "y": 8
    }
  ],
  "options": {
    "movementBlocking": true,
    "gameplayHud": true,
    "playableSaveLoad": true
  },
  "gameplayHud": {
    "inputs": 0,
    "blockedMoves": 0,
    "lastInput": "none",
    "lastResult": "idle"
  }
}
```

## Regras

- `version` deve ser `1`.
- `kind` deve ser exatamente `browser.playable-demo.local-state`.
- `sceneId` deve bater com a cena do HTML atual.
- `tick` deve bater com o tick do snapshot embutido no HTML atual.
- `controlledEntityId` deve bater com a entidade controlavel do HTML atual.
- `positions` deve conter a posicao da entidade controlavel, com `x` e `y` inteiros.
- `options.playableSaveLoad` deve ser `true`.
- `options.gameplayHud` e `options.movementBlocking` devem bater com as opcoes do HTML atual quando `options` estiver presente.
- `gameplayHud` e opcional; quando ausente em uma demo com HUD ativo, o import zera contadores locais e marca `lastResult` como `loaded`.
- com `movementBlocking` ativo, import de posicao bloqueada por `collision.bounds` solido ou tile solido e rejeitado.

## Fixtures

- `fixtures/browser-demo/playable-local-state.v1.json`
- `fixtures/browser-demo/playable-local-state-hud-blocking.v1.json`
- `fixtures/browser-demo/playable-local-state-scene-mismatch.invalid.json`
- `fixtures/browser-demo/playable-local-state-blocked-position.invalid.json`

## Fora de escopo

- persistencia automatica;
- `localStorage`, `sessionStorage` ou `IndexedDB`;
- escrita em disco;
- rede ou `fetch`;
- checksum de savegame;
- migracao entre versoes;
- multiplas cenas;
- compatibilidade com `State Snapshot v1`;
- substituicao de `save-state` ou `load-save`.
