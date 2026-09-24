// TEMPORARY ISOLATED PROJECT ONLY. No mail access, client data or production IDs.
// Run setupReceiptTest once, deploy a temporary web app, then delete project/Sheet.
const RECEIPT_TEST_MARKER = 'mentorsphere-isolated-receipt-test-v1';
const RECEIPT_TEST_SECRET = 'FICTIONAL-RECEIPT-TEST-ONLY-NO-CLIENT-DATA';
const RECEIPT_TEST_NAME = 'INTAKE_RECEIPT_ISOLATED_TEST_ONLY';
const RECEIPT_TEST_CASES = {
  'receipt-test-fast': ['00000000-0000-4000-8000-000000000001', 0],
  'receipt-test-13s': ['00000000-0000-4000-8000-000000000002', 13000],
  'receipt-test-20s': ['00000000-0000-4000-8000-000000000003', 20000],
  'receipt-test-old-13s': ['00000000-0000-4000-8000-000000000004', 13000]
};
function output_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function setupReceiptTest() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('RECEIPT_TEST_SHEET_ID')) throw new Error('Already initialised');
  const book = SpreadsheetApp.create(RECEIPT_TEST_NAME, 5, 3);
  book.getSheets()[0].appendRow(['ID', 'formVersion', 'receivedAt']);
  SpreadsheetApp.flush();
  properties.setProperty('RECEIPT_TEST_SHEET_ID', book.getId());
  console.log(JSON.stringify({ fixture: RECEIPT_TEST_MARKER, temporarySheet: book.getUrl() }));
}
function sheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('RECEIPT_TEST_SHEET_ID');
  if (!id) throw new Error('Not initialised');
  const book = SpreadsheetApp.openById(id);
  if (book.getName() !== RECEIPT_TEST_NAME) throw new Error('Wrong Sheet');
  const sheet = book.getSheets()[0];
  if (sheet.getLastColumn() !== 3 || sheet.getLastRow() > 5) throw new Error('Wrong shape');
  if (sheet.getRange(1, 1, 1, 3).getDisplayValues()[0].join('|') !== 'ID|formVersion|receivedAt') throw new Error('Wrong headers');
  return sheet;
}
function rows_(sheet) {
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues() : [];
  if (rows.some(r => !RECEIPT_TEST_CASES[r[1]] || RECEIPT_TEST_CASES[r[1]][0] !== r[0])) throw new Error('Non-test row');
  return rows;
}
function doGet() {
  try {
    const rows = rows_(sheet_());
    return output_({ fixture: RECEIPT_TEST_MARKER, notificationsDisabled: true, rowCount: rows.length, ids: rows.map(r => r[0]) });
  } catch (_) { return output_({ success: false, status: 'rejected' }); }
}
function doPost(event) {
  let lock;
  try {
    const raw = event && event.postData && event.postData.contents;
    if (typeof raw !== 'string' || raw.length > 2048) throw new Error('Bad request');
    const envelope = JSON.parse(raw);
    if (typeof envelope.body !== 'string' || typeof envelope.signature !== 'string') throw new Error('Bad envelope');
    const signature = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(envelope.body, RECEIPT_TEST_SECRET)).replace(/=+$/, '');
    let difference = signature.length ^ envelope.signature.length;
    for (let i = 0; i < signature.length; i++) difference |= signature.charCodeAt(i) ^ (envelope.signature.charCodeAt(i) || 0);
    if (difference !== 0) throw new Error('Bad signature');
    const signed = JSON.parse(envelope.body), payload = signed.payload;
    const age = Date.now() - Date.parse(signed.issuedAt);
    if (!Number.isFinite(age) || Math.abs(age) > 300000) throw new Error('Expired');
    if (!payload || Object.keys(payload).sort().join('|') !== 'formVersion|submissionId') throw new Error('Synthetic fields only');
    const test = RECEIPT_TEST_CASES[payload.formVersion];
    if (!test || test[0] !== payload.submissionId) throw new Error('Synthetic IDs only');
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw new Error('Busy');
    const sheet = sheet_(), rows = rows_(sheet), existing = rows.filter(r => r[0] === payload.submissionId);
    if (existing.length > 1 || (existing.length === 1 && existing[0][1] !== payload.formVersion)) throw new Error('Invalid duplicate');
    if (existing.length === 1) return output_({ success: true, stored: false, status: 'duplicate', existingRecordVerified: true });
    const row = [payload.submissionId, payload.formVersion, new Date().toISOString()];
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, 3);
    range.setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();
    if (range.getDisplayValues()[0].join('|') !== row.join('|') || range.getFormulas()[0].some(Boolean)) throw new Error('Unverified row');
    if (test[1]) Utilities.sleep(test[1]);
    return output_({ success: true, stored: true, status: 'created', notificationSent: false });
  } catch (_) { return output_({ success: false, stored: false, status: 'rejected' }); }
  finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
