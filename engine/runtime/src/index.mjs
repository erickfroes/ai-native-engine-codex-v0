export { loadSchemaRegistry, getRepoRoot } from './schema/registry.mjs';
export { validateSceneFile, formatValidationReport } from './scene/validate-scene.mjs';
export { validateLoopScene, formatSceneValidationReportV1 } from './scene/validate-loop-scene.mjs';
export { validateSaveFile } from './save/validate-save.mjs';
export { canonicalJSONStringify, sha256Hex, createSha256Checksum } from './save/canonical-json.mjs';
export { saveStateSnapshotV1, loadStateSnapshotSaveV1 } from './save/state-snapshot-save.mjs';
export { validateInputIntentV1, validateInputIntentV1File } from './input/validate-input-intent-v1.mjs';
export { loadValidatedInputIntentV1 } from './input/load-validated-input-intent-v1.mjs';
export { createInputIntentFromKeyboardV1 } from './input/create-input-intent-from-keyboard-v1.mjs';
export { validateAssetManifestV1, validateAssetManifestV1File } from './assets/validate-asset-manifest-v1.mjs';
export { loadValidatedAssetManifestV1 } from './assets/load-validated-asset-manifest-v1.mjs';
export {
  validateKeyboardInputScriptV1,
  validateKeyboardInputScriptV1File
} from './input/validate-keyboard-input-script-v1.mjs';
export { loadValidatedKeyboardInputScriptV1 } from './input/load-validated-keyboard-input-script-v1.mjs';
export { createKeyboardInputIntentResolverFromScriptV1 } from './input/create-keyboard-input-intent-resolver-v1.mjs';
export { loadSceneFile } from './scene/load-scene.mjs';
export { summarizeScene } from './scene/summary.mjs';
export { validateSceneInvariants } from './scene/invariants.mjs';
export { buildWorldSnapshotMessage, validateNetMessageContract } from './network/world-snapshot.mjs';
export { runDeterministicReplay } from './replay/run-deterministic-replay.mjs';
export { buildReplayArtifact } from './replay/replay-artifact.mjs';
export { generateReplaySignature } from './replay/replay-signature.mjs';
export { runMinimalSystemLoop } from './loop/run-minimal-system-loop.mjs';
export { runMinimalSystemLoopWithTrace } from './loop/run-minimal-system-loop.mjs';
export { runLoopWithKeyboardInputScriptV1 } from './loop/run-loop-with-keyboard-input-script-v1.mjs';
export { createLoopExecutionPlan } from './loop/create-loop-execution-plan.mjs';
export { createLoopSchedule } from './loop/loop-scheduler.mjs';
export { createPhasedLoopSchedulePreview } from './loop/phased-scheduler-preview.mjs';
export { buildRenderSnapshotV1 } from './render/build-render-snapshot-v1.mjs';
export { renderSnapshotToSvgV1, RENDER_SVG_VERSION } from './render/render-snapshot-to-svg-v1.mjs';
export { renderSvgDemoHtmlV1, SVG_DEMO_HTML_VERSION } from './render/render-svg-demo-html-v1.mjs';
export { renderCanvas2DDemoHtmlV1, CANVAS_2D_DEMO_VERSION } from './render/render-canvas2d-demo-html-v1.mjs';
export {
  renderBrowserPlayableDemoHtmlV1,
  createBrowserPlayableDemoMetadataV1,
  BROWSER_PLAYABLE_DEMO_VERSION,
  DEFAULT_BROWSER_PLAYABLE_STEP_PX
} from './render/render-browser-playable-demo-html-v1.mjs';
export { materializeBrowserDemoAssetSrcV1 } from './render/materialize-browser-demo-asset-src-v1.mjs';
export {
  buildHtmlGameExportV1,
  exportHtmlGameV1,
  SIMPLE_HTML_EXPORT_VERSION
} from './export/export-html-game-v1.mjs';
export {
  createStateModelV1FromScene,
  createInitialStateFromScene,
  snapshotStateV1
} from './state/state-model-v1.mjs';
export {
  getStateProcessorRegistryV1,
  listStateProcessors,
  getStateProcessor,
  runStateProcessor,
  runStateProcessorsForTick
} from './state/state-processor-registry-v1.mjs';
export { simulateStateV1 } from './state/simulate-state-v1.mjs';
export { simulateStateV1WithMutationTrace } from './state/simulate-state-v1.mjs';
export {
  getComponentRegistryV1,
  listKnownComponents,
  getKnownComponent,
  isKnownComponent
} from './components/component-registry-v1.mjs';
export { buildCollisionBoundsReportV1 } from './collision/build-collision-bounds-report-v1.mjs';
export { buildCollisionOverlapReportV1 } from './collision/build-collision-overlap-report-v1.mjs';
export { buildMovementBlockingReportV1 } from './collision/build-movement-blocking-report-v1.mjs';
export { buildTileCollisionReportV1 } from './collision/build-tile-collision-report-v1.mjs';
export { buildAudioLiteReportV1 } from './audio/build-audio-lite-report-v1.mjs';
export { getSystemRegistryV1, getKnownSystemDefinition } from './systems/system-registry.mjs';
export {
  getSystemPhaseRegistryV1,
  getSystemPhase,
  getKnownSystemPhase,
  listSystemPhases,
  assertSystemHasPhase,
  assertPhaseRegistryIntegrity
} from './systems/system-phase-registry.mjs';

export { buildSpriteAnimationReportV1 } from './render/build-sprite-animation-report-v1.mjs';
