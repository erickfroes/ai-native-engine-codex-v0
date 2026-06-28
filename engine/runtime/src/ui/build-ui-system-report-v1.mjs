import { resolveUiSceneV1 } from './resolve-ui-scene-v1.mjs';

const UI_SCREEN_COMPONENT_KIND = 'ui.screen';

function compareStableString(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareStableInteger(left, right) {
  return left - right;
}

function normalizeWidget(widget, parentWidgetId, depth) {
  return {
    widgetId: widget.id,
    kind: widget.kind,
    text: widget.kind === 'label' ? widget.text : null,
    x: widget.x ?? 0,
    y: widget.y ?? 0,
    width: widget.width ?? null,
    height: widget.height ?? null,
    parentWidgetId,
    depth
  };
}

function buildWidgetTree(widgets, parentWidgetId = null, depth = 0, flatWidgets = []) {
  return (widgets ?? []).map((widget) => {
    const normalized = normalizeWidget(widget, parentWidgetId, depth);
    flatWidgets.push(normalized);

    return {
      widgetId: normalized.widgetId,
      kind: normalized.kind,
      text: normalized.text,
      x: normalized.x,
      y: normalized.y,
      width: normalized.width,
      height: normalized.height,
      children: buildWidgetTree(widget.children ?? [], normalized.widgetId, depth + 1, flatWidgets)
    };
  });
}

function buildScreens(scene) {
  const screens = [];

  for (const entity of scene.entities ?? []) {
    for (const component of entity.components ?? []) {
      if (component?.kind !== UI_SCREEN_COMPONENT_KIND) {
        continue;
      }

      const fields = component.fields ?? {};
      const widgets = [];
      const widgetTree = buildWidgetTree(fields.widgets ?? [], null, 0, widgets);

      screens.push({
        screenId: fields.screenId,
        entityId: entity.id,
        active: fields.active !== false,
        layer: fields.layer ?? 0,
        widgets,
        widgetTree
      });
    }
  }

  return screens.sort(
    (left, right) =>
      compareStableInteger(left.layer, right.layer) ||
      compareStableString(left.screenId, right.screenId) ||
      compareStableString(left.entityId, right.entityId)
  );
}

export function createUiSystemReportV1FromScene(scene) {
  return {
    uiSystemReportVersion: 1,
    scene: scene.metadata.name,
    screens: buildScreens(scene),
    warnings: []
  };
}

export async function buildUiSystemReportV1(sceneOrPath) {
  const { scene } = await resolveUiSceneV1(sceneOrPath, 'buildUiSystemReportV1');
  return createUiSystemReportV1FromScene(scene);
}
