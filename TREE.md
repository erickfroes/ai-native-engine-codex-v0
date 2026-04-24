# TREE — estrutura principal do repositório

> Estrutura resumida dos diretórios/arquivos relevantes (sem `node_modules`).

```text
.
├── AGENTS.md
├── README.md
├── SPEC.md
├── ROADMAP.md
├── FIRST_SPRINT.md
├── package.json
├── docs/
│   ├── CODEX_FIRST_PROMPT.md
│   ├── CODEX_HANDOFF.md
│   ├── PHASE_CHECKLIST.md
│   └── module-contracts.md
├── schemas/
│   ├── asset_manifest.schema.json
│   ├── component.schema.json
│   ├── input_bindings.schema.json
│   ├── net_message.schema.json
│   ├── prefab.schema.json
│   ├── render_profile.schema.json
│   ├── savegame.schema.json
│   ├── scene.schema.json
│   └── ui_layout.schema.json
├── scenes/
│   ├── assets.manifest.json
│   ├── tutorial.firstloop.replay.json
│   ├── tutorial.input.json
│   ├── tutorial.netmsg.json
│   ├── tutorial.netmsg.tick43.json
│   ├── tutorial.render.json
│   ├── tutorial.save.json
│   ├── tutorial.scene.json
│   └── tutorial.ui.json
├── engine/
│   ├── README.md
│   └── runtime/
│       ├── README.md
│       ├── package.json
│       ├── src/
│       │   ├── cli.mjs
│       │   ├── index.mjs
│       │   ├── assets/
│       │   │   └── validate-manifest.mjs
│       │   ├── ecs/
│       │   │   ├── scene-hierarchy.mjs
│       │   │   └── world.mjs
│       │   ├── input/
│       │   │   └── validate-input.mjs
│       │   ├── network/
│       │   │   ├── diff-snapshots.mjs
│       │   │   ├── simulate-replication.mjs
│       │   │   ├── validate-net-message.mjs
│       │   │   └── validate-sequence.mjs
│       │   ├── prefab/
│       │   │   └── validate-prefab.mjs
│       │   ├── render/
│       │   │   └── validate-render.mjs
│       │   ├── save/
│       │   │   └── validate-save.mjs
│       │   ├── scene/
│       │   │   ├── invariants.mjs
│       │   │   ├── load-scene.mjs
│       │   │   ├── summary.mjs
│       │   │   └── validate-scene.mjs
│       │   ├── schema/
│       │   │   ├── mini-json-schema.mjs
│       │   │   └── registry.mjs
│       │   ├── systems/
│       │   │   ├── benchmark-first-loop.mjs
│       │   │   ├── first-loop.mjs
│       │   │   ├── replay-artifact.mjs
│       │   │   ├── replay-first-loop.mjs
│       │   │   └── verify-replay-determinism.mjs
│       │   └── ui/
│       │       └── validate-ui.mjs
│       └── test/
│           ├── *.test.mjs
│           └── fixtures/
│               ├── assets/
│               ├── network/
│               └── prefabs/
├── tools/
│   └── mcp-server/
│       ├── README.md
│       ├── package.json
│       ├── src/
│       │   ├── index.mjs
│       │   └── tool-catalog.mjs
│       └── test/
│           └── mcp-server.test.mjs
└── plugins/
    └── engine-codex-integration/
        └── skills/
            └── engine-bootstrap/
                └── SKILL.md
```
