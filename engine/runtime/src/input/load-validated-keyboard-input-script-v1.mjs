import { validateKeyboardInputScriptV1File } from './validate-keyboard-input-script-v1.mjs';

function formatKeyboardInputScriptErrors(report) {
  return report.errors.map((error) => `${error.path}: ${error.message}`).join('; ');
}

export async function loadValidatedKeyboardInputScriptV1(scriptPath) {
  const report = await validateKeyboardInputScriptV1File(scriptPath);

  if (report.ok) {
    return report.keyboardInputScript;
  }

  const error = new Error(`keyboard input script is invalid: ${formatKeyboardInputScriptErrors(report)}`);
  error.name = 'KeyboardInputScriptValidationError';
  error.report = report;
  throw error;
}
