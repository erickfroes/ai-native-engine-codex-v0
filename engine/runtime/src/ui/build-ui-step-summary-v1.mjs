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

export function buildUiStepSummaryV1(actions, localScreenState, actionDirection) {
  const initialState = buildUiStepInitialStateV1(actions, localScreenState);

  if (actions.length === 0) {
    return {
      stepType: 'noop',
      direction: actionDirection,
      inputHandled: false,
      actionCandidates: initialState.actionCandidates,
      focusedActionIndexBefore: null,
      focusedActionIdBefore: null,
      focusedWidgetIdBefore: null,
      focusedActionIndexAfter: null,
      focusedActionIdAfter: null,
      focusedWidgetIdAfter: null,
      activatedActionId: null,
      warnings: initialState.warnings
    };
  }

  const focusedActionIndex = initialState.focusedActionIndex;
  const focusedAction = actions[focusedActionIndex];

  const stepSummary = {
    stepType: actionDirection === 0 ? 'activate' : 'focus',
    direction: actionDirection,
    inputHandled: true,
    actionCandidates: initialState.actionCandidates,
    focusedActionIndexBefore: focusedActionIndex,
    focusedActionIdBefore: focusedAction.actionId,
    focusedWidgetIdBefore: focusedAction.widgetId,
    focusedActionIndexAfter: focusedActionIndex,
    focusedActionIdAfter: focusedAction.actionId,
    focusedWidgetIdAfter: focusedAction.widgetId,
    activatedActionId: null,
    warnings: initialState.warnings
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

export function buildUiStepInitialStateV1(actions, localScreenState) {
  const actionCandidates = buildActionCandidates(actions);

  if (actions.length === 0) {
    return {
      actionCandidates,
      focusedActionIndex: null,
      focusedActionId: null,
      focusedWidgetId: null,
      warnings: [
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
  const warnings = [];

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

  return {
    actionCandidates,
    focusedActionIndex,
    focusedActionId: focusedAction.actionId,
    focusedWidgetId: focusedAction.widgetId,
    warnings
  };
}
