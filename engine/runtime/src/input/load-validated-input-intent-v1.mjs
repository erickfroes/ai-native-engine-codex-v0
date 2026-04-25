import { validateInputIntentV1File } from './validate-input-intent-v1.mjs';

function formatInputIntentErrors(report) {
  return report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
}

export async function loadValidatedInputIntentV1(inputIntentPath) {
  const report = await validateInputIntentV1File(inputIntentPath);

  if (report.ok) {
    return report.inputIntent;
  }

  const error = new Error(`input intent is invalid: ${formatInputIntentErrors(report)}`);
  error.name = 'InputIntentValidationError';
  error.report = report;
  throw error;
}
