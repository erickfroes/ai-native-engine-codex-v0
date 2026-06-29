import assert from 'node:assert/strict';

export function assertAudioEventBankReportV1(report) {
  assert.equal(typeof report, 'object');
  assert.notEqual(report, null);
  assert.equal(report.audioEventBankReportVersion, 1);
  assert.equal(typeof report.ok, 'boolean');
  assert.equal(typeof report.absolutePath, 'string');
  assert.equal(
    report.sceneAbsolutePath === null || typeof report.sceneAbsolutePath === 'string',
    true
  );
  assert.equal(report.scene === null || typeof report.scene === 'string', true);
  assert.equal(report.manifest === null || typeof report.manifest === 'object', true);
  assert.equal(typeof report.summary, 'object');
  assert.equal(typeof report.summary.bankCount, 'number');
  assert.equal(typeof report.summary.eventCount, 'number');
  assert.equal(typeof report.summary.sceneClipCount, 'number');
  assert.equal(typeof report.summary.referencedClipCount, 'number');
  assert.equal(typeof report.summary.unreferencedClipCount, 'number');
  assert.equal(report.sceneAudio === null || typeof report.sceneAudio === 'object', true);
  assert.equal(Array.isArray(report.banks), true);
  assert.equal(Array.isArray(report.errors), true);
  assert.equal(Array.isArray(report.warnings), true);

  if (report.sceneAudio !== null) {
    assert.equal(Array.isArray(report.sceneAudio.clips), true);
    assert.equal(Array.isArray(report.sceneAudio.warnings), true);
    assert.equal(Array.isArray(report.sceneAudio.invalidRefs), true);
  }

  for (const bank of report.banks) {
    assert.equal(typeof bank.bankId, 'string');
    assert.equal(typeof bank.eventCount, 'number');
    assert.equal(Array.isArray(bank.events), true);

    for (const event of bank.events) {
      assert.equal(typeof event.eventId, 'string');
      assert.equal(Array.isArray(event.clipIds), true);
      assert.equal(Array.isArray(event.clips), true);
    }
  }

  for (const issue of [...report.errors, ...report.warnings]) {
    assert.equal(typeof issue.target, 'string');
    assert.equal(issue.ref === null || typeof issue.ref === 'string', true);
    assert.equal(typeof issue.path, 'string');
    assert.equal(typeof issue.message, 'string');
  }
}
