import { buildUiSystemReportV1 } from './build-ui-system-report-v1.mjs';

export const UI_NAVIGATION_FOCUS_REPORT_VERSION = 1;
export const UI_NAVIGATION_FOCUS_SCOPE_POLICY = 'topmost-active-screen';

function countScreenCandidates(screen) {
  if (screen.active !== true) {
    return 0;
  }

  return collectLeafLabelCandidates(screen).length;
}

function collectLeafLabelCandidates(screen) {
  const parentWidgetIds = new Set(
    screen.widgets
      .map((widget) => widget.parentWidgetId)
      .filter((widgetId) => typeof widgetId === 'string' && widgetId.length > 0)
  );

  return screen.widgets
    .filter((widget) => widget.kind === 'label' && !parentWidgetIds.has(widget.widgetId))
    .map((widget, candidateIndex, allWidgets) => ({
      screenId: screen.screenId,
      entityId: screen.entityId,
      widgetId: widget.widgetId,
      kind: widget.kind,
      text: widget.text,
      parentWidgetId: widget.parentWidgetId,
      depth: widget.depth,
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
      candidateIndex,
      previousCandidateWidgetId: allWidgets[candidateIndex - 1]?.widgetId ?? null,
      nextCandidateWidgetId: allWidgets[candidateIndex + 1]?.widgetId ?? null
    }));
}

function buildScreens(uiSystemReport, focusedScreen) {
  return uiSystemReport.screens.map((screen) => ({
    screenId: screen.screenId,
    entityId: screen.entityId,
    active: screen.active,
    layer: screen.layer,
    inFocusScope:
      focusedScreen !== null &&
      screen.screenId === focusedScreen.screenId &&
      screen.entityId === focusedScreen.entityId,
    candidateCount: countScreenCandidates(screen)
  }));
}

function buildWarnings(focusedScreen, candidates) {
  const warnings = [];

  if (focusedScreen === null) {
    warnings.push({
      code: 'NO_ACTIVE_SCREEN',
      message: 'No active ui.screen is available for the focus scope.'
    });
    return warnings;
  }

  if (candidates.length === 0) {
    warnings.push({
      code: 'NO_FOCUS_CANDIDATES',
      screenId: focusedScreen.screenId,
      entityId: focusedScreen.entityId,
      message: 'The focus scope has no leaf label widgets to derive navigation candidates from.'
    });
    return warnings;
  }

  for (const candidate of candidates) {
    if (candidate.width === null || candidate.height === null) {
      warnings.push({
        code: 'PARTIAL_WIDGET_GEOMETRY',
        screenId: candidate.screenId,
        widgetId: candidate.widgetId,
        message: 'Derived focus candidate has partial widget geometry because width or height is omitted.'
      });
    }
  }

  warnings.push({
    code: 'DERIVED_CANDIDATES_HAVE_NO_ACTION_SEMANTICS',
    screenId: focusedScreen.screenId,
    entityId: focusedScreen.entityId,
    message: 'Focus candidates are derived from labels and do not declare activation or action semantics.'
  });

  return warnings;
}

export function createUiNavigationFocusReportV1FromUiSystemReport(uiSystemReport) {
  const activeScreens = uiSystemReport.screens.filter((screen) => screen.active === true);
  const focusedScreen = activeScreens.length > 0 ? activeScreens[activeScreens.length - 1] : null;
  const candidates = focusedScreen === null ? [] : collectLeafLabelCandidates(focusedScreen);

  return {
    uiNavigationFocusReportVersion: UI_NAVIGATION_FOCUS_REPORT_VERSION,
    scene: uiSystemReport.scene,
    sourceUiSystemReportVersion: uiSystemReport.uiSystemReportVersion,
    scopePolicy: UI_NAVIGATION_FOCUS_SCOPE_POLICY,
    focusedScreenId: focusedScreen?.screenId ?? null,
    focusedEntityId: focusedScreen?.entityId ?? null,
    initialFocusWidgetId: candidates[0]?.widgetId ?? null,
    screens: buildScreens(uiSystemReport, focusedScreen),
    candidates,
    warnings: buildWarnings(focusedScreen, candidates)
  };
}

export async function buildUiNavigationFocusReportV1(sceneOrPath) {
  const uiSystemReport = await buildUiSystemReportV1(sceneOrPath);
  return createUiNavigationFocusReportV1FromUiSystemReport(uiSystemReport);
}
