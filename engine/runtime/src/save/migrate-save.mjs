const legacySaveVersion = 0;
const currentSaveVersion = 1;

export function migrateLegacySaveEnvelope(saveEnvelope) {
  if (saveEnvelope?.saveVersion !== legacySaveVersion) {
    return saveEnvelope;
  }

  return {
    ...saveEnvelope,
    saveVersion: currentSaveVersion
  };
}
