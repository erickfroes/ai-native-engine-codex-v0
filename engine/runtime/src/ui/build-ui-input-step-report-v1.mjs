import { createUiActionSemanticsReportV1FromScene } from './build-ui-action-semantics-report-v1.mjs';
import { createUiLocalScreenStateReportV1FromReports } from './build-ui-local-screen-state-report-v1.mjs';
import {
  createUiNavigationFocusReportV1FromUiSystemReport,
} from './build-ui-navigation-focus-report-v1.mjs';
import { createUiSystemReportV1FromScene } from './build-ui-system-report-v1.mjs';
import { resolveUiSceneV1 } from './resolve-ui-scene-v1.mjs';
import { validateInputIntentV1 } from '../input/validate-input-intent-v1.mjs';

export const UI_INPUT_STEP_REPORT_VERSION = 1;
export const UI_INPUT_STEP_SCOPE_POLICY = 'topmost-active-screen';

function toInteger(value, fallback) {
  return Number.isInteger(value) ? value : fallback;
}

function resolveAttemptedMove(inputIntent) {
  return (inputIntent.actions ?? []).filter((action) => action?.type === 'move').reduce(
    (accumulator, action) => ({
      x: accumulator.x + toInteger(action.axis?.x, 0),
      y: accumulator.y + toInteger(action.axis?.y, 0)
    }),
    { x: 0, y: 0 }
  );
}

function resolveDirection(attemptedMove) {
  if (attemptedMove.x > 0) {
    return 1;
  }
  if (attemptedMove.x < 0) {
    return -1;
  }
  if (attemptedMove.y > 0) {
    return 1;
  }
  if (attemptedMove.y < 0) {
    return -1;
  }
  return 0;
}

function buildActionCandidates(actions) {
  return actions.map((action) => ({
    actionIndex: action.actionIndex,
    actionId: action.actionId,
    widgetId: action.widgetId
  }));
}

function resolveFocusedActionIndex(actions, localScreenState) {
  if (actions.length === 0) {
    return null;
  }

  if (localScreenState.focusSource === 'ui.action.semantics' && localScreenState.focusedActionId) {
    const foundIndex = actions.findIndex((action) => action.actionId === localScreenState.focusedActionId);
    if (foundIndex !== -1) {
      return foundIndex;
    }
  }

  if (localScreenState.focusedWidgetId !== null) {
    const foundIndex = actions.findIndex((action) => action.widgetId === localScreenState.focusedWidgetId);
    if (foundIndex !== -1) {
      return foundIndex;
    }
  }

  return null;
}

function buildStepSummary(actions, localScreenState, actionDirection) {
  const warnings = [];
  const actionCandidates = buildActionCandidates(actions);

  if (actions.length === 0) {
    return {
      stepType: actionDirection === 0 ? 'noop' : 'noop',
      direction: actionDirection,
      inputHandled: false,
      actionCandidates,
      focusedActionIndexBefore: null,
      focusedActionIdBefore: null,
      focusedWidgetIdBefore: null,
      focusedActionIndexAfter: null,
      focusedActionIdAfter: null,
      focusedWidgetIdAfter: null,
      activatedActionId: null,
      warnings: [
        ...warnings,
        {
          code: 'NO_ACTIONS_AVAILABLE',
          screenId: localScreenState.focusedScreenId,
          entityId: localScreenState.focusedEntityId,
          message: 'No actionable UI action was available in the focused scope.'
        }
      ]
    };
  }

  let focusedActionIndex = resolveFocusedActionIndex(actions, localScreenState);
  let focusedAction = focusedActionIndex === null ? null : actions[focusedActionIndex];

  if (focusedAction === null) {
    warnings.push({
      code: 'FOCUSED_ACTION_NOT_RESOLVED',
      screenId: localScreenState.focusedScreenId,
      entityId: localScreenState.focusedEntityId,
      message:
        'The focused widget/action was not resolvable into a ui.action.semantics action; fallback to action index 0 for deterministic local stepping.'
    });
    focusedActionIndex = 0;
    focusedAction = actions[focusedActionIndex];
  }

  const stepSummary = {
    stepType: actionDirection === 0 ? 'activate' : 'focus',
    direction: actionDirection,
    inputHandled: true,
    actionCandidates,
    focusedActionIndexBefore: focusedActionIndex,
    focusedActionIdBefore: focusedAction.actionId,
    focusedWidgetIdBefore: focusedAction.widgetId,
    focusedActionIndexAfter: focusedActionIndex,
    focusedActionIdAfter: focusedAction.actionId,
    focusedWidgetIdAfter: focusedAction.widgetId,
    activatedActionId: null,
    warnings
  };

  if (actionDirection === 0) {
    if (localScreenState.focusSource !== 'ui.action.semantics' || localScreenState.focusedActionId === null) {
      stepSummary.stepType = 'noop';
      stepSummary.inputHandled = false;
      stepSummary.warnings.push({
        code: 'NO_ACTION_FOCUS_FOR_ACTIVATION',
        screenId: localScreenState.focusedScreenId,
        entityId: localScreenState.focusedEntityId,
        message: 'No focused actionable action was resolved; no activation is applied.'
      });
      return stepSummary;
    }

    stepSummary.activatedActionId = focusedAction.actionId;
    return stepSummary;
  }

  const candidateIndex = focusedActionIndex + actionDirection;
  const clampedIndex = Math.max(0, Math.min(candidateIndex, actions.length - 1));

  if (clampedIndex !== candidateIndex) {
    stepSummary.warnings.push({
      code: 'UI_ACTION_FOCUS_BOUNDARY',
      screenId: localScreenState.focusedScreenId,
      entityId: localScreenState.focusedEntityId,
      actionIndex: focusedActionIndex,
      attemptedActionIndex: candidateIndex,
      message: 'UI focus cannot move beyond action list boundaries in this step.'
    });
  }

  const nextAction = actions[clampedIndex];
  stepSummary.focusedActionIndexAfter = clampedIndex;
  stepSummary.focusedActionIdAfter = nextAction.actionId;
  stepSummary.focusedWidgetIdAfter = nextAction.widgetId;

  if (clampedIndex !== focusedActionIndex) {
    stepSummary.stepType = 'focus-move';
  }

  return stepSummary;
}

function buildReportV1({
  sourceScene,
  uiActionSemanticsReport,
  uiLocalScreenStateReport,
  inputIntent,
  attemptedMove
}) {
  const actionDirection = resolveDirection(attemptedMove);
  const stepSummary = buildStepSummary(uiActionSemanticsReport.actions, uiLocalScreenStateReport, actionDirection);
  const warnings = [
    ...uiLocalScreenStateReport.warnings,
    ...stepSummary.warnings
  ];

  return {
    uiInputStepReportVersion: UI_INPUT_STEP_REPORT_VERSION,
    scene: sourceScene.metadata.name,
    sourceUiSystemReportVersion: uiLocalScreenStateReport.sourceUiSystemReportVersion,
    sourceUiNavigationFocusReportVersion: uiLocalScreenStateReport.sourceUiNavigationFocusReportVersion,
    sourceUiActionSemanticsReportVersion: uiActionSemanticsReport.uiActionSemanticsReportVersion,
    sourceUiLocalScreenStateReportVersion: uiLocalScreenStateReport.uiLocalScreenStateReportVersion,
    scopePolicy: UI_INPUT_STEP_SCOPE_POLICY,
    inputIntentVersion: inputIntent.inputIntentVersion,
    inputIntentTick: inputIntent.tick,
    inputIntentEntityId: inputIntent.entityId,
    attemptedMove,
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

export async function buildUiInputStepReportV1(sceneOrPath, options = {}) {
  const { inputIntent } = options;
  if (!inputIntent || typeof inputIntent !== 'object' || Array.isArray(inputIntent)) {
    throw new Error('buildUiInputStepReportV1: `inputIntent` option is required');
  }

  const report = await validateInputIntentV1(inputIntent);
  if (!report.ok) {
    const summary = report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
    throw new Error(`buildUiInputStepReportV1: invalid inputIntent: ${summary}`);
  }

  const validInputIntent = report.inputIntent;
  const { scene } = await resolveUiSceneV1(sceneOrPath, 'buildUiInputStepReportV1');
  const uiSystemReport = createUiSystemReportV1FromScene(scene);
  const uiNavigationFocusReport = createUiNavigationFocusReportV1FromUiSystemReport(uiSystemReport);
  const uiActionSemanticsReport = createUiActionSemanticsReportV1FromScene(scene);
  const uiLocalScreenStateReport = createUiLocalScreenStateReportV1FromReports({
    uiSystemReport,
    uiNavigationFocusReport,
    uiActionSemanticsReport
  });
  const attemptedMove = resolveAttemptedMove(validInputIntent);

  return buildReportV1({
    sourceScene: scene,
    uiActionSemanticsReport,
    uiLocalScreenStateReport,
    inputIntent: validInputIntent,
    attemptedMove
  });
}
