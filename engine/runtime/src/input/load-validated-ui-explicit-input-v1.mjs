import { validateUiExplicitInputV1File } from './validate-ui-explicit-input-v1.mjs';

function formatUiExplicitInputErrors(report) {
  return report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
}

export async function loadValidatedUiExplicitInputV1(uiExplicitInputPath) {
  const report = await validateUiExplicitInputV1File(uiExplicitInputPath);

  if (report.ok) {
    return report.uiExplicitInput;
  }

  const error = new Error(`ui explicit input is invalid: ${formatUiExplicitInputErrors(report)}`);
  error.name = 'UiExplicitInputValidationError';
  error.report = report;
  throw error;
}
