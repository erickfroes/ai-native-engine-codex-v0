import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateSceneFile, loadSceneFile } from '../src/index.mjs';
import { validateSceneInvariants } from '../src/scene/invariants.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');

function scenePath(relativePath) {
  return path.join(repoRoot, 'scenes', relativePath);
}

function fixturePath(relativePath) {
  return path.join(repoRoot, 'engine', 'runtime', 'test', 'fixtures', relativePath);
}

function validateVisualSpriteFields(fields, componentOverrides = {}) {
  return validateSceneInvariants({
    version: 1,
    metadata: { name: 'visual-sprite-negative' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 0, y: 0 }
          },
          {
            kind: 'visual.sprite',
            version: 1,
            replicated: false,
            fields,
            ...componentOverrides
          }
        ]
      }
    ]
  });
}

function validateTileLayerFields(fields, componentOverrides = {}) {
  return validateSceneInvariants({
    version: 1,
    metadata: { name: 'tile-layer-negative' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'map.ground',
        components: [
          {
            kind: 'tile.layer',
            version: 1,
            replicated: false,
            fields,
            ...componentOverrides
          }
        ]
      }
    ]
  });
}

test('validates tutorial scene successfully', async () => {
  const report = await validateSceneFile(scenePath('tutorial.scene.json'));

  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.summary.entityCount, 2);
  assert.equal(report.summary.replicatedComponentCount, 2);
});

test('reports duplicate ids and replicated-system mismatch', async () => {
  const report = await validateSceneFile(fixturePath('invalid_duplicate_id.scene.json'));

  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.message.includes('duplicate entity id')));
  assert.ok(
    report.errors.some((error) => error.message.includes('missing system "networking.replication"'))
  );
  assert.ok(report.errors.some((error) => error.message.includes('duplicate component kind')));
});

test('loadSceneFile throws when the scene is invalid', async () => {
  await assert.rejects(() => loadSceneFile(fixturePath('invalid_duplicate_id.scene.json')), {
    name: 'SceneValidationError'
  });
});

test('visual.sprite component invariants are validated predictably', () => {
  const report = validateSceneInvariants({
    version: 1,
    metadata: { name: 'invalid-visual' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 0, y: 0 }
          },
          {
            kind: 'visual.sprite',
            version: 2,
            replicated: true,
            fields: {
              assetId: ' ',
              width: 0,
              height: -1,
              layer: 1.5,
              tint: '#fff'
            }
          }
        ]
      }
    ]
  });

  assert.ok(report.errors.some((error) => error.path.endsWith('.version') && error.message.includes('version')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.replicated') && error.message.includes('must not be replicated')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.assetId') && error.message.includes('assetId')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.width') && error.message.includes('dimensions')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.height') && error.message.includes('dimensions')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.layer') && error.message.includes('layer')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.tint') && error.message.includes('not allowed')));
});

test('visual.sprite rejects non-object fields predictably', () => {
  const report = validateSceneInvariants({
    version: 1,
    metadata: { name: 'invalid-visual-fields' },
    systems: ['core.loop'],
    entities: [
      {
        id: 'player.hero',
        components: [
          {
            kind: 'transform',
            version: 1,
            replicated: false,
            fields: { x: 0, y: 0 }
          },
          {
            kind: 'visual.sprite',
            version: 1,
            replicated: false,
            fields: null
          }
        ]
      }
    ]
  });

  assert.ok(report.errors.some((error) => error.path.endsWith('.fields') && error.message.includes('must be an object')));
  assert.equal(report.errors.some((error) => error.path.endsWith('.fields.assetId')), false);
});

test('visual.sprite rejects missing assetId predictably', () => {
  const report = validateVisualSpriteFields({ width: 16, height: 16 });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[1].fields.assetId' &&
        error.message === 'visual.sprite assetId must be a non-empty string'
    )
  );
});

test('visual.sprite rejects empty assetId predictably', () => {
  for (const assetId of ['', '   ']) {
    const report = validateVisualSpriteFields({ assetId, width: 16, height: 16 });

    assert.ok(
      report.errors.some(
        (error) =>
          error.path === '$.entities[0].components[1].fields.assetId' &&
          error.message === 'visual.sprite assetId must be a non-empty string'
      )
    );
  }
});

test('visual.sprite rejects invalid width and height predictably', () => {
  const report = validateVisualSpriteFields({
    assetId: 'player.sprite',
    width: 0,
    height: 1.5
  });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[1].fields.width' &&
        error.message === 'visual.sprite dimensions must be integers >= 1'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[1].fields.height' &&
        error.message === 'visual.sprite dimensions must be integers >= 1'
    )
  );
});

test('visual.sprite rejects invalid layer predictably', () => {
  const report = validateVisualSpriteFields({
    assetId: 'player.sprite',
    layer: 1.5
  });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[1].fields.layer' &&
        error.message === 'visual.sprite layer must be an integer'
    )
  );
});

test('tile.layer component invariants are validated predictably', () => {
  const report = validateTileLayerFields(
    {
      tileWidth: 0,
      tileHeight: -1,
      columns: 1.5,
      rows: 0,
      layer: 0.5,
      tiles: [[1]],
      palette: {
        1: {
          kind: 'rect',
          width: 0,
          height: 1.5,
          tint: '#fff'
        }
      },
      collision: true
    },
    {
      version: 2,
      replicated: true
    }
  );

  assert.ok(report.errors.some((error) => error.path.endsWith('.version') && error.message.includes('version')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.replicated') && error.message.includes('must not be replicated')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.tileWidth') && error.message.includes('integer >= 1')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.tileHeight') && error.message.includes('integer >= 1')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.columns') && error.message.includes('integer >= 1')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.rows') && error.message.includes('integer >= 1')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.layer') && error.message.includes('layer')));
  assert.ok(report.errors.some((error) => error.path.endsWith('.fields.collision') && error.message.includes('not allowed')));
  assert.ok(
    report.errors.some(
      (error) =>
        error.path.endsWith('.fields.palette."1".width') &&
        error.message === 'tile.layer palette rect width must be an integer >= 1'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path.endsWith('.fields.palette."1".height') &&
        error.message === 'tile.layer palette rect height must be an integer >= 1'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path.endsWith('.fields.palette."1".tint') &&
        error.message === 'is not allowed for tile.layer rect palette entry'
    )
  );
});

test('tile.layer rejects non-object fields predictably', () => {
  const report = validateTileLayerFields(null);

  assert.ok(report.errors.some((error) => error.path.endsWith('.fields') && error.message.includes('must be an object')));
  assert.equal(report.errors.some((error) => error.path.endsWith('.fields.tiles')), false);
});

test('tile.layer rejects missing palette predictably', () => {
  const report = validateTileLayerFields({
    tileWidth: 16,
    tileHeight: 16,
    columns: 1,
    rows: 1,
    tiles: [[1]]
  });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.palette' &&
        error.message === 'tile.layer palette must be an object'
    )
  );
});

test('tile.layer rejects row count mismatches predictably', () => {
  const rowsTooFew = validateTileLayerFields({
    tileWidth: 16,
    tileHeight: 16,
    columns: 1,
    rows: 2,
    tiles: [[1]],
    palette: {
      1: { kind: 'rect' }
    }
  });
  const rowsTooMany = validateTileLayerFields({
    tileWidth: 16,
    tileHeight: 16,
    columns: 1,
    rows: 1,
    tiles: [[1], [1]],
    palette: {
      1: { kind: 'rect' }
    }
  });

  for (const report of [rowsTooFew, rowsTooMany]) {
    assert.ok(
      report.errors.some(
        (error) =>
          error.path === '$.entities[0].components[0].fields.tiles' &&
          error.message === 'tile.layer tiles row count must equal rows'
      )
    );
  }
});

test('tile.layer rejects column count mismatches predictably', () => {
  const columnsTooFew = validateTileLayerFields({
    tileWidth: 16,
    tileHeight: 16,
    columns: 2,
    rows: 1,
    tiles: [[1]],
    palette: {
      1: { kind: 'rect' }
    }
  });
  const columnsTooMany = validateTileLayerFields({
    tileWidth: 16,
    tileHeight: 16,
    columns: 1,
    rows: 1,
    tiles: [[1, 1]],
    palette: {
      1: { kind: 'rect' }
    }
  });

  for (const report of [columnsTooFew, columnsTooMany]) {
    assert.ok(
      report.errors.some(
        (error) =>
          error.path === '$.entities[0].components[0].fields.tiles[0]' &&
          error.message === 'tile.layer tiles column count must equal columns'
      )
    );
  }
});

test('tile.layer rejects tile ids without palette entries predictably', () => {
  const report = validateTileLayerFields({
    tileWidth: 16,
    tileHeight: 16,
    columns: 2,
    rows: 1,
    tiles: [[1, 2]],
    palette: {
      1: { kind: 'rect' }
    }
  });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tiles[0][1]' &&
        error.message === 'tile.layer tile id `2` must exist in palette'
    )
  );
});

test('tile.layer rejects invalid required grid integers predictably', () => {
  const report = validateTileLayerFields({
    tileWidth: 0,
    tileHeight: -1,
    columns: 1.5,
    rows: 0,
    tiles: [[1]],
    palette: {
      1: { kind: 'rect' }
    }
  });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tileWidth' &&
        error.message === 'tile.layer tileWidth must be an integer >= 1'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tileHeight' &&
        error.message === 'tile.layer tileHeight must be an integer >= 1'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.columns' &&
        error.message === 'tile.layer columns must be an integer >= 1'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.rows' &&
        error.message === 'tile.layer rows must be an integer >= 1'
    )
  );
});

test('tile.layer validates grid dimensions and palette references predictably', () => {
  const report = validateTileLayerFields({
    tileWidth: 16,
    tileHeight: 16,
    columns: 3,
    rows: 2,
    tiles: [
      [1, 1],
      [1, 2, 1],
      [1, 1, 1]
    ],
    palette: {
      0: { kind: 'empty' },
      1: { kind: 'rect', width: 16, height: 16 }
    }
  });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tiles' &&
        error.message === 'tile.layer tiles row count must equal rows'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tiles[0]' &&
        error.message === 'tile.layer tiles column count must equal columns'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tiles[1][1]' &&
        error.message === 'tile.layer tile id `2` must exist in palette'
    )
  );
});

test('tile.layer rejects invalid tile sizes predictably', () => {
  const report = validateTileLayerFields({
    tileWidth: 0,
    tileHeight: 1.5,
    columns: 1,
    rows: 1,
    tiles: [[1]],
    palette: {
      1: { kind: 'rect' }
    }
  });

  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tileWidth' &&
        error.message === 'tile.layer tileWidth must be an integer >= 1'
    )
  );
  assert.ok(
    report.errors.some(
      (error) =>
        error.path === '$.entities[0].components[0].fields.tileHeight' &&
        error.message === 'tile.layer tileHeight must be an integer >= 1'
    )
  );
});
