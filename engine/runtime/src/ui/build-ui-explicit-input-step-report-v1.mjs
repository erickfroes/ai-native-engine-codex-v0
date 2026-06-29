import { createUiActionSemanticsReportV1FromScene } from './build-ui-action-semantics-report-v1.mjs';
import { createUiLocalScreenStateReportV1FromReports } from './build-ui-local-screen-state-report-v1.mjs';
import {
  createUiNavigationFocusReportV1FromUiSystemReport,
} from './build-ui-navigation-focus-report-v1.mjs';
import { createUiSystemReportV1FromScene } from './build-ui-system-report-v1.mjs';
import { buildUiStepSummaryV1 } from './build-ui-step-summary-v1.mjs';
import { resolveUiSceneV1 } from './resolve-ui-scene-v1.mjs';
import { validateUiExplicitInputV1 } from '../input/validate-ui-explicit-input-v1.mjs';

export const UI_EXPLICIT_INPUT_STEP_REPORT_VERSION = 1;
export const UI_EXPLICIT_INPUT_STEP_SCOPE_POLICY = 'topmost-active-screen';

function resolveDirection(uiExplicitInput) {
  if (uiExplicitInput.action.type === 'activate') {
    return 0;
  }

  return uiExplicitInput.action.direction === 'next' ? 1 : -1;
}

function buildReportV1({
  sourceScene,
  uiActionSemanticsReport,
  uiLocalScreenStateReport,
  uiExplicitInput
}) {
  const actionDirection = resolveDirection(uiExplicitInput);
  const stepSummary = buildUiStepSummaryV1(
    uiActionSemanticsReport.actions,
    uiLocalScreenStateReport,
    actionDirection
  );
  const warnings = [
    ...uiLocalScreenStateReport.warnings,
    ...stepSummary.warnings
  ];

  return {
    uiExplicitInputStepReportVersion: UI_EXPLICIT_INPUT_STEP_REPORT_VERSION,
    scene: sourceScene.metadata.name,
    sourceUiSystemReportVersion: uiLocalScreenStateReport.sourceUiSystemReportVersion,
    sourceUiNavigationFocusReportVersion: uiLocalScreenStateReport.sourceUiNavigationFocusReportVersion,
    sourceUiActionSemanticsReportVersion: uiActionSemanticsReport.uiActionSemanticsReportVersion,
    sourceUiLocalScreenStateReportVersion: uiLocalScreenStateReport.uiLocalScreenStateReportVersion,
    scopePolicy: UI_EXPLICIT_INPUT_STEP_SCOPE_POLICY,
    uiExplicitInputVersion: uiExplicitInput.uiExplicitInputVersion,
    uiExplicitInputTick: uiExplicitInput.tick,
    actionType: uiExplicitInput.action.type,
    direction: actionDirection,
    focusedScreenId: uiLocalScreenStateReport.focusedScreenId,
    focusedEntityId: uiLocalScreenStateReport.focusedEntityId,
    stepType: stepSummary.stepType,
    inputHandled: stepSummary.inputHandled,
    focusedActionIndexBefore: stepSummary.focusedActionIndexBefore,
    focusedActionIdBefore: stepSummary.focusedActionIdBefore,
    focusedWidgetIdBefore: stepSummary.focusedWidgetIdBefore,
    focusedActionIndexAfter: stepSummary.focusedActionIndexAfter,
    focusedActionIdAfter: stepSummary.focusedActionIdAfter,
    focusedWidgetIdAfter: stepSummary.focusedWidgetIdAfter,
    actionCandidates: stepSummary.actionCandidates,
    activatedActionId: stepSummary.activatedActionId,
    warnings
  };
}

export async function buildUiExplicitInputStepReportV1(sceneOrPath, options = {}) {
  const { uiExplicitInput } = options;
  if (!uiExplicitInput || typeof uiExplicitInput !== 'object' || Array.isArray(uiExplicitInput)) {
    throw new Error('buildUiExplicitInputStepReportV1: `uiExplicitInput` option is required');
  }

  const report = await validateUiExplicitInputV1(uiExplicitInput);
  if (!report.ok) {
    const summary = report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`buildUiExplicitInputStepReportV1: invalid uiExplicitInput: ${summary}`);
  }

  const validUiExplicitInput = report.uiExplicitInput;
  const { scene } = await resolveUiSceneV1(sceneOrPath, 'buildUiExplicitInputStepReportV1');
  const uiSystemReport = createUiSystemReportV1FromScene(scene);
  const uiNavigationFocusReport = createUiNavigationFocusReportV1FromUiSystemReport(uiSystemReport);
  const uiActionSemanticsReport = createUiActionSemanticsReportV1FromScene(scene);
  const uiLocalScreenStateReport = createUiLocalScreenStateReportV1FromReports({
    uiSystemReport,
    uiNavigationFocusReport,
    uiActionSemanticsReport
  });

  return buildReportV1({
    sourceScene: scene,
    uiActionSemanticsReport,
    uiLocalScreenStateReport,
    uiExplicitInput: validUiExplicitInput
  });
}
