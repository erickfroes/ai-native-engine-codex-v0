import { validateSceneFile } from '../scene/validate-scene.mjs';
import { validateSceneInvariants } from '../scene/invariants.mjs';

const UI_SCREEN_COMPONENT_KIND = 'ui.screen';

function compareStableString(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareStableInteger(left, right) {
  return left - right;
}

function pushSceneStructureError(errors, errorPath, message) {
  errors.push(`${errorPath}: ${message}`);
}

function validateSceneObject(scene) {
  const errors = [];

  if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
    throw new Error('buildUiSystemReportV1: `sceneOrPath` must be a scene object or path string');
  }

  if (!scene.metadata || typeof scene.metadata !== 'object' || Array.isArray(scene.metadata)) {
    pushSceneStructureError(errors, '$.metadata', 'must be an object');
  } else if (typeof scene.metadata.name !== 'string' || scene.metadata.name.trim().length === 0) {
    pushSceneStructureError(errors, '$.metadata.name', 'must be a non-empty string');
  }

  if (!Array.isArray(scene.entities)) {
    pushSceneStructureError(errors, '$.entities', 'must be an array');
  } else {
    for (const [entityIndex, entity] of scene.entities.entries()) {
      const entityPath = `$.entities[${entityIndex}]`;

      if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
        pushSceneStructureError(errors, entityPath, 'must be an object');
        continue;
      }

      if (typeof entity.id !== 'string' || entity.id.trim().length === 0) {
        pushSceneStructureError(errors, `${entityPath}.id`, 'must be a non-empty string');
      }

      if (!Array.isArray(entity.components)) {
        pushSceneStructureError(errors, `${entityPath}.components`, 'must be an array');
        continue;
      }

      for (const [componentIndex, component] of entity.components.entries()) {
        const componentPath = `${entityPath}.components[${componentIndex}]`;

        if (!component || typeof component !== 'object' || Array.isArray(component)) {
          pushSceneStructureError(errors, componentPath, 'must be an object');
          continue;
        }

        if (typeof component.kind !== 'string' || component.kind.trim().length === 0) {
          pushSceneStructureError(errors, `${componentPath}.kind`, 'must be a non-empty string');
        }
      }
    }
  }

  if (errors.length === 0) {
    const invariantReport = validateSceneInvariants(scene);
    for (const error of invariantReport.errors) {
      pushSceneStructureError(errors, error.path, error.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(`buildUiSystemReportV1: scene object is invalid: ${errors.join('; ')}`);
  }
}

async function resolveScene(sceneOrPath) {
  if (typeof sceneOrPath === 'string') {
    const report = await validateSceneFile(sceneOrPath);
    if (!report.ok) {
      const error = new Error(`Scene validation failed for ${report.absolutePath}`);
      error.name = 'SceneValidationError';
      error.report = report;
      throw error;
    }

    return {
      scene: report.scene
    };
  }

  validateSceneObject(sceneOrPath);
  return {
    scene: sceneOrPath
  };
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
  const { scene } = await resolveScene(sceneOrPath);
  return createUiSystemReportV1FromScene(scene);
}
