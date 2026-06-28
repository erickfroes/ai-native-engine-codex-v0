import { createUiActionSemanticsReportV1FromScene } from './build-ui-action-semantics-report-v1.mjs';
import {
  createUiNavigationFocusReportV1FromUiSystemReport,
  UI_NAVIGATION_FOCUS_SCOPE_POLICY,
  UI_NAVIGATION_FOCUS_REPORT_VERSION
} from './build-ui-navigation-focus-report-v1.mjs';
import { createUiSystemReportV1FromScene } from './build-ui-system-report-v1.mjs';
import { resolveUiSceneV1 } from './resolve-ui-scene-v1.mjs';

export const UI_LOCAL_SCREEN_STATE_REPORT_VERSION = 1;
export const UI_LOCAL_SCREEN_FOCUS_RESOLUTION_POLICY = 'action-semantics-then-navigation-focus';

function createScreenKey(screenId, entityId) {
  return `${screenId}::${entityId}`;
}

function buildScreenSummaryMap(screens) {
  return new Map(screens.map((screen) => [createScreenKey(screen.screenId, screen.entityId), screen]));
}

function resolveFocusedActionId(uiActionSemanticsReport) {
  if (typeof uiActionSemanticsReport.initialFocusWidgetId !== 'string') {
    return null;
  }

  return (
    uiActionSemanticsReport.actions.find(
      (action) => action.widgetId === uiActionSemanticsReport.initialFocusWidgetId
    )?.actionId ?? null
  );
}

function buildWarnings({
  focusedScreen,
  focusSource,
  focusedWidgetId,
  heuristicFocusedWidgetId
}) {
  const warnings = [];

  if (focusedScreen === null) {
    warnings.push({
      code: 'NO_ACTIVE_SCREEN',
      message: 'No active ui.screen is available for local screen state.'
    });
    return warnings;
  }

  if (focusSource === 'none') {
    warnings.push({
      code: 'NO_FOCUSED_WIDGET',
      screenId: focusedScreen.screenId,
      entityId: focusedScreen.entityId,
      message: 'The focused ui.screen has no resolved focused widget in ui.action.semantics or UiNavigationFocusReport v1.'
    });
    return warnings;
  }

  if (focusSource === 'ui.navigation.focus') {
    warnings.push({
      code: 'FOCUSED_SCREEN_USES_HEURISTIC_FOCUS',
      screenId: focusedScreen.screenId,
      entityId: focusedScreen.entityId,
      widgetId: focusedWidgetId,
      message:
        'The focused ui.screen has no authored action semantics, so local focus falls back to UiNavigationFocusReport v1 heuristics.'
    });
    return warnings;
  }

  if (
    typeof heuristicFocusedWidgetId === 'string' &&
    heuristicFocusedWidgetId !== focusedWidgetId
  ) {
    warnings.push({
      code: 'ACTION_FOCUS_DIFFERS_FROM_HEURISTIC_FOCUS',
      screenId: focusedScreen.screenId,
      entityId: focusedScreen.entityId,
      focusedWidgetId,
      heuristicFocusedWidgetId,
      message:
        'Authored ui.action.semantics focus overrides the heuristic UiNavigationFocusReport v1 candidate for the focused screen.'
    });
  }

  return warnings;
}

export function createUiLocalScreenStateReportV1FromReports({
  uiSystemReport,
  uiNavigationFocusReport,
  uiActionSemanticsReport
}) {
  const activeScreens = uiSystemReport.screens.filter((screen) => screen.active === true);
  const focusedScreen = activeScreens[activeScreens.length - 1] ?? null;
  const focusedScreenKey =
    focusedScreen === null ? null : createScreenKey(focusedScreen.screenId, focusedScreen.entityId);
  const activeStackIndexByKey = new Map(
    activeScreens.map((screen, stackIndex) => [createScreenKey(screen.screenId, screen.entityId), stackIndex])
  );
  const uiNavigationFocusScreensByKey = buildScreenSummaryMap(uiNavigationFocusReport.screens);
  const uiActionSemanticsScreensByKey = buildScreenSummaryMap(uiActionSemanticsReport.screens);
  const focusedActionId = resolveFocusedActionId(uiActionSemanticsReport);
  const heuristicFocusedWidgetId =
    focusedScreenKey !== null &&
    uiNavigationFocusReport.focusedScreenId === focusedScreen?.screenId &&
    uiNavigationFocusReport.focusedEntityId === focusedScreen?.entityId
      ? uiNavigationFocusReport.initialFocusWidgetId
      : null;
  const authoredFocusedWidgetId =
    focusedScreenKey !== null &&
    uiActionSemanticsReport.focusedScreenId === focusedScreen?.screenId &&
    uiActionSemanticsReport.focusedEntityId === focusedScreen?.entityId
      ? uiActionSemanticsReport.initialFocusWidgetId
      : null;
  const focusedWidgetId = authoredFocusedWidgetId ?? heuristicFocusedWidgetId ?? null;
  const focusSource =
    authoredFocusedWidgetId !== null
      ? 'ui.action.semantics'
      : heuristicFocusedWidgetId !== null
        ? 'ui.navigation.focus'
        : 'none';

  return {
    uiLocalScreenStateReportVersion: UI_LOCAL_SCREEN_STATE_REPORT_VERSION,
    scene: uiSystemReport.scene,
    sourceUiSystemReportVersion: uiSystemReport.uiSystemReportVersion,
    sourceUiNavigationFocusReportVersion: UI_NAVIGATION_FOCUS_REPORT_VERSION,
    sourceUiActionSemanticsReportVersion: uiActionSemanticsReport.uiActionSemanticsReportVersion,
    scopePolicy: UI_NAVIGATION_FOCUS_SCOPE_POLICY,
    focusResolutionPolicy: UI_LOCAL_SCREEN_FOCUS_RESOLUTION_POLICY,
    focusedScreenId: focusedScreen?.screenId ?? null,
    focusedEntityId: focusedScreen?.entityId ?? null,
    focusedWidgetId,
    focusedActionId: focusSource === 'ui.action.semantics' ? focusedActionId : null,
    heuristicFocusedWidgetId,
    focusSource,
    screens: uiSystemReport.screens.map((screen) => {
      const screenKey = createScreenKey(screen.screenId, screen.entityId);
      const navigationScreen = uiNavigationFocusScreensByKey.get(screenKey);
      const actionScreen = uiActionSemanticsScreensByKey.get(screenKey);
      const inFocusScope = screenKey === focusedScreenKey;
      const localState =
        screen.active !== true
          ? 'inactive'
          : inFocusScope
            ? 'active-scope'
            : 'active-background';

      return {
        screenId: screen.screenId,
        entityId: screen.entityId,
        active: screen.active,
        layer: screen.layer,
        localState,
        inActiveStack: screen.active === true,
        stackIndex: activeStackIndexByKey.get(screenKey) ?? null,
        inFocusScope,
        hasActionSemantics: actionScreen?.hasActionSemantics ?? false,
        candidateCount: navigationScreen?.candidateCount ?? 0,
        actionCount: actionScreen?.actionCount ?? 0,
        focusedWidgetId: inFocusScope ? focusedWidgetId : null,
        focusedActionId:
          inFocusScope && focusSource === 'ui.action.semantics' ? focusedActionId : null,
        focusSource: inFocusScope ? focusSource : 'none'
      };
    }),
    warnings: buildWarnings({
      focusedScreen,
      focusSource,
      focusedWidgetId,
      heuristicFocusedWidgetId
    })
  };
}

export async function buildUiLocalScreenStateReportV1(sceneOrPath) {
  const { scene } = await resolveUiSceneV1(sceneOrPath, 'buildUiLocalScreenStateReportV1');
  const uiSystemReport = createUiSystemReportV1FromScene(scene);
  const uiNavigationFocusReport = createUiNavigationFocusReportV1FromUiSystemReport(uiSystemReport);
  const uiActionSemanticsReport = createUiActionSemanticsReportV1FromScene(scene);

  return createUiLocalScreenStateReportV1FromReports({
    uiSystemReport,
    uiNavigationFocusReport,
    uiActionSemanticsReport
  });
}
