import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { validateSceneFile, formatValidationReport, loadSceneFile } from './index.mjs';

function printUsage() {
  console.log(`Usage:
  node engine/runtime/src/cli.mjs validate-scene <path> [--json]
  node engine/runtime/src/cli.mjs describe-scene <path> [--json]
  node engine/runtime/src/cli.mjs validate-all-scenes [dir] [--json]`);
}

async function collectSceneFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const found = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      found.push(...await collectSceneFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.scene.json')) {
      found.push(absolutePath);
    }
  }

  return found.sort();
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function run() {
  const [, , command, maybePath] = process.argv;
  const asJson = hasFlag('--json');

  if (!command) {
    printUsage();
    process.exitCode = 2;
    return;
  }

  if (command === 'validate-scene') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const report = await validateSceneFile(maybePath);
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatValidationReport(report));
    }
    process.exitCode = report.ok ? 0 : 1;
    return;
  }

  if (command === 'describe-scene') {
    if (!maybePath) {
      printUsage();
      process.exitCode = 2;
      return;
    }

    const scene = await loadSceneFile(maybePath);
    const description = {
      name: scene.metadata.name,
      systems: scene.systems ?? [],
      entities: (scene.entities ?? []).map((entity) => ({
        id: entity.id,
        name: entity.name ?? null,
        components: (entity.components ?? []).map((component) => component.kind)
      }))
    };

    if (asJson) {
      console.log(JSON.stringify(description, null, 2));
    } else {
      console.log(`Scene: ${description.name}`);
      console.log(`Systems: ${description.systems.join(', ') || '(none)'}`);
      console.log('Entities:');
      for (const entity of description.entities) {
        console.log(`- ${entity.id} (${entity.name ?? 'unnamed'}): ${entity.components.join(', ')}`);
      }
    }
    return;
  }

  if (command === 'validate-all-scenes') {
    const sceneDir = path.resolve(maybePath ?? './scenes');
    const files = await collectSceneFiles(sceneDir);
    const reports = [];

    for (const file of files) {
      reports.push(await validateSceneFile(file));
    }

    const ok = reports.every((report) => report.ok);
    if (asJson) {
      console.log(JSON.stringify(reports, null, 2));
    } else {
      for (const report of reports) {
        console.log(formatValidationReport(report));
        console.log('');
      }
      console.log(`Summary: ${reports.filter((report) => report.ok).length}/${reports.length} valid scene(s)`);
    }

    process.exitCode = ok ? 0 : 1;
    return;
  }

  printUsage();
  process.exitCode = 2;
}

run().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
