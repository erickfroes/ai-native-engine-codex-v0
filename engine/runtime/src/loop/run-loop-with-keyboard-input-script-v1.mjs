import { loadSceneFile } from '../scene/load-scene.mjs';
import { createKeyboardInputIntentResolverFromScriptV1 } from '../input/create-keyboard-input-intent-resolver-v1.mjs';
import { loadValidatedKeyboardInputScriptV1 } from '../input/load-validated-keyboard-input-script-v1.mjs';
import { runMinimalSystemLoop, runMinimalSystemLoopWithTrace } from './run-minimal-system-loop.mjs';

export async function runLoopWithKeyboardInputScriptV1(scenePath, scriptPath, options = {}) {
  const scene = await loadSceneFile(scenePath);
  const keyboardInputScript = await loadValidatedKeyboardInputScriptV1(scriptPath);
  const inputIntentResolver = createKeyboardInputIntentResolverFromScriptV1(keyboardInputScript);

  if (options.trace === true) {
    return runMinimalSystemLoopWithTrace(scene, {
      ticks: options.ticks,
      seed: options.seed,
      inputIntentResolver,
      movementBlocking: options.movementBlocking
    });
  }

  return runMinimalSystemLoop(scene, {
    ticks: options.ticks,
    seed: options.seed,
    inputIntentResolver,
    movementBlocking: options.movementBlocking
  });
}
