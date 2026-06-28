import { createUiSystemReportV1FromScene } from './build-ui-system-report-v1.mjs';
import { resolveUiSceneV1 } from './resolve-ui-scene-v1.mjs';

export const UI_ACTION_SEMANTICS_COMPONENT_KIND = 'ui.action.semantics';
export const UI_ACTION_SEMANTICS_REPORT_VERSION = 1;
export const UI_ACTION_SEMANTICS_SCOPE_POLICY = 'topmost-active-screen';

function collectActionSemanticsByEntity(scene) {
  const semanticsByEntityId = new Map();

  for (const entity of scene.entities ?? []) {
    const semanticsComponent = (entity.components ?? []).find(
      (component) => component?.kind === UI_ACTION_SEMANTICS_COMPONENT_KIND
    );
    if (!semanticsComponent) {
      continue;
    }

    semanticsByEntityId.set(entity.id, semanticsComponent.fields ?? {});
  }

  return semanticsByEntityId;
}

function buildScreenWidgetLookup(screen) {
  const parentWidgetIds = new Set(
    screen.widgets
      .map((widget) => widget.parentWidgetId)
      .filter((widgetId) => typeof widgetId === 'string' && widgetId.length > 0)
  );

  return {
    parentWidgetIds,
    widgetById: new Map(screen.widgets.map((widget) => [widget.widgetId, widget]))
  };
}

function buildActionWarnings(screen, semantics, resolvedActions, widgetLookup) {
  const warnings = [];

  for (const action of semantics.actions ?? []) {
    const widget = widgetLookup.widgetById.get(action.widgetId);
    if (!widget) {
      warnings.push({
        code: 'ACTION_WIDGET_NOT_FOUND',
        screenId: screen.screenId,
        entityId: screen.entityId,
        widgetId: action.widgetId,
        actionId: action.actionId,
        message: 'Action semantics references a widgetId that does not exist on the target ui.screen.'
      });
      continue;
    }

    if (widget.kind !== 'label' || widgetLookup.parentWidgetIds.has(widget.widgetId)) {
      warnings.push({
        code: 'ACTION_WIDGET_MUST_BE_LEAF_LABEL',
        screenId: screen.screenId,
        entityId: screen.entityId,
        widgetId: action.widgetId,
        actionId: action.actionId,
        message: 'UI Action Semantics Lite v1 only allows leaf label widgets to define actions.'
      });
    }
  }

  if (
    typeof semantics.initialFocusWidgetId === 'string' &&
    !resolvedActions.some((action) => action.widgetId === semantics.initialFocusWidgetId)
  ) {
    warnings.push({
      code: 'INITIAL_FOCUS_WIDGET_NOT_ACTIONABLE',
      screenId: screen.screenId,
      entityId: screen.entityId,
      widgetId: semantics.initialFocusWidgetId,
      message:
        'initialFocusWidgetId does not resolve to an actionable leaf label widget; the first resolved action becomes the fallback focus.'
    });
  }

  return warnings;
}

function buildResolvedActions(screen, semantics) {
  if (!semantics) {
    return {
      bindingCount: 0,
      actions: [],
      initialFocusWidgetId: null,
      warnings: []
    };
  }

  const widgetLookup = buildScreenWidgetLookup(screen);
  const actions = [];

  for (const action of semantics.actions ?? []) {
    const widget = widgetLookup.widgetById.get(action.widgetId);
    if (!widget) {
      continue;
    }

    if (widget.kind !== 'label' || widgetLookup.parentWidgetIds.has(widget.widgetId)) {
      continue;
    }

    actions.push({
      screenId: screen.screenId,
      entityId: screen.entityId,
      widgetId: widget.widgetId,
      kind: 'label',
      text: widget.text,
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
      actionId: action.actionId
    });
  }

  const indexedActions = actions.map((action, actionIndex, allActions) => ({
    ...action,
    actionIndex,
    previousActionWidgetId: allActions[actionIndex - 1]?.widgetId ?? null,
    nextActionWidgetId: allActions[actionIndex + 1]?.widgetId ?? null
  }));

  const warnings = buildActionWarnings(screen, semantics, indexedActions, widgetLookup);
  const initialFocusWidgetId =
    indexedActions.length === 0
      ? null
      : typeof semantics.initialFocusWidgetId === 'string' &&
          indexedActions.some((action) => action.widgetId === semantics.initialFocusWidgetId)
        ? semantics.initialFocusWidgetId
        : indexedActions[0].widgetId;

  return {
    bindingCount: semantics.actions?.length ?? 0,
    actions: indexedActions,
    initialFocusWidgetId,
    warnings
  };
}

function buildScreenSummaries(uiSystemReport, actionDetailsByEntityId, focusedScreen) {
  return uiSystemReport.screens.map((screen) => {
    const actionDetails = actionDetailsByEntityId.get(screen.entityId);

    return {
      screenId: screen.screenId,
      entityId: screen.entityId,
      active: screen.active,
      layer: screen.layer,
      inActionScope:
        focusedScreen !== null &&
        screen.screenId === focusedScreen.screenId &&
        screen.entityId === focusedScreen.entityId,
      hasActionSemantics: actionDetails !== undefined,
      bindingCount: actionDetails?.bindingCount ?? 0,
      actionCount: actionDetails?.actions.length ?? 0
    };
  });
}

function buildWarnings(focusedScreen, focusedDetails, focusedSummary) {
  const warnings = [];

  if (focusedScreen === null) {
    warnings.push({
      code: 'NO_ACTIVE_SCREEN',
      message: 'No active ui.screen is available for the action semantics scope.'
    });
    return warnings;
  }

  if (focusedSummary?.hasActionSemantics !== true) {
    warnings.push({
      code: 'NO_ACTION_SEMANTICS',
      screenId: focusedScreen.screenId,
      entityId: focusedScreen.entityId,
      message: 'The focused ui.screen has no authored ui.action.semantics component.'
    });
    return warnings;
  }

  warnings.push(...(focusedDetails?.warnings ?? []));

  if ((focusedDetails?.actions.length ?? 0) === 0) {
    warnings.push({
      code: 'NO_ACTIONABLE_WIDGETS',
      screenId: focusedScreen.screenId,
      entityId: focusedScreen.entityId,
      message: 'The focused ui.screen has action semantics but no actionable leaf label widgets.'
    });
  }

  return warnings;
}

export function createUiActionSemanticsReportV1FromScene(scene) {
  const uiSystemReport = createUiSystemReportV1FromScene(scene);
  const actionSemanticsByEntityId = collectActionSemanticsByEntity(scene);
  const actionDetailsByEntityId = new Map();

  for (const screen of uiSystemReport.screens) {
    const semantics = actionSemanticsByEntityId.get(screen.entityId);
    if (!semantics) {
      continue;
    }

    actionDetailsByEntityId.set(screen.entityId, buildResolvedActions(screen, semantics));
  }

  const activeScreens = uiSystemReport.screens.filter((screen) => screen.active === true);
  const focusedScreen = activeScreens.length > 0 ? activeScreens[activeScreens.length - 1] : null;
  const screens = buildScreenSummaries(uiSystemReport, actionDetailsByEntityId, focusedScreen);
  const focusedDetails = focusedScreen === null ? null : actionDetailsByEntityId.get(focusedScreen.entityId) ?? null;
  const focusedSummary =
    focusedScreen === null
      ? null
      : screens.find((screen) => screen.entityId === focusedScreen.entityId && screen.screenId === focusedScreen.screenId) ??
        null;

  return {
    uiActionSemanticsReportVersion: UI_ACTION_SEMANTICS_REPORT_VERSION,
    scene: uiSystemReport.scene,
    sourceUiSystemReportVersion: uiSystemReport.uiSystemReportVersion,
    scopePolicy: UI_ACTION_SEMANTICS_SCOPE_POLICY,
    focusedScreenId: focusedScreen?.screenId ?? null,
    focusedEntityId: focusedScreen?.entityId ?? null,
    initialFocusWidgetId: focusedDetails?.initialFocusWidgetId ?? null,
    screens,
    actions: focusedDetails?.actions ?? [],
    warnings: buildWarnings(focusedScreen, focusedDetails, focusedSummary)
  };
}

export async function buildUiActionSemanticsReportV1(sceneOrPath) {
  const { scene } = await resolveUiSceneV1(sceneOrPath, 'buildUiActionSemanticsReportV1');
  return createUiActionSemanticsReportV1FromScene(scene);
}
