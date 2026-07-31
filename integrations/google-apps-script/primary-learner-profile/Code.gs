const FORM_VERSION = 'primary-learner-profile-v1';
const ACKNOWLEDGEMENT_VERSION = 'approval-candidate-2026-07-31';
const MAX_REQUEST_CHARACTERS = 50000;
const SIGNATURE_WINDOW_MILLISECONDS = 5 * 60 * 1000;

const SHEET_COLUMNS = [
  'Submission ID',
  'Worker accepted at (UTC)',
  'Google received at (UTC)',
  'Form version',
  'Respondent email',
  'Respondent first name',
  'Respondent surname',
  'Relationship to learner',
  'Relationship details',
  'Mobile number',
  'Preferred contact method',
  'Suitable contact times',
  'Learner first name',
  'Learner surname',
  'Learner date of birth',
  'Year group or equivalent',
  'Year group details',
  'Subjects requiring support',
  'Other subject',
  'Needs status',
  'Relevant need areas',
  'Support needs information',
  'Helpful strategies',
  'Unhelpful approaches',
  'Other educational or personal background',
  'EHCP status',
  'Preferred session length',
  'Preferred session frequency',
  'Wider MentorSphere support discussion',
  'Authorised confirmation',
  'Privacy acknowledgement',
  'Sensitive-information acknowledgement',
  'Acknowledgement wording version',
  'Notification status',
  'Notification sent at (UTC)',
];

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function safeError_() {
  return jsonOutput_({ ok: false, status: 'rejected' });
}

function constantTimeEqual_(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index % Math.max(1, left.length)) || 0) ^
      (right.charCodeAt(index % Math.max(1, right.length)) || 0);
  }
  return difference === 0;
}

function expectedSignature_(body, secret) {
  const bytes = Utilities.computeHmacSha256Signature(body, secret, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/u, '');
}

function isFreshTimestamp_(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const difference = Math.abs(Date.now() - timestamp);
  return difference <= SIGNATURE_WINDOW_MILLISECONDS;
}

function isObject_(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasValidShape_(request) {
  if (!isObject_(request) || !isFreshTimestamp_(request.issuedAt) || !isObject_(request.payload)) return false;
  const payload = request.payload;
  return payload.formVersion === FORM_VERSION &&
    typeof payload.submissionId === 'string' &&
    /^[0-9a-f-]{36}$/iu.test(payload.submissionId) &&
    isObject_(payload.respondent) &&
    isObject_(payload.learner) &&
    isObject_(payload.supportProfile) &&
    isObject_(payload.sessionPreferences) &&
    isObject_(payload.confirmations) &&
    payload.confirmations.authorised === true &&
    payload.confirmations.privacyAcknowledged === true &&
    payload.confirmations.sensitiveDataAcknowledged === true;
}

function text_(value) {
  if (Array.isArray(value)) return value.map(text_).filter(Boolean).join(' | ');
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  return /^[=+\-@]/u.test(text) ? `'${text}` : text;
}

function rowFor_(request, receivedAt) {
  const payload = request.payload;
  return [
    payload.submissionId,
    request.issuedAt,
    receivedAt,
    payload.formVersion,
    payload.respondent.email,
    payload.respondent.firstName,
    payload.respondent.surname,
    payload.respondent.relationship,
    payload.respondent.relationshipOther,
    payload.respondent.mobile,
    payload.respondent.preferredContactMethod,
    payload.respondent.suitableContactTimes,
    payload.learner.firstName,
    payload.learner.surname,
    payload.learner.dateOfBirth,
    payload.learner.yearGroup,
    payload.learner.yearGroupOther,
    payload.learner.subjects,
    payload.learner.subjectOther,
    payload.supportProfile.needsStatus,
    payload.supportProfile.relevantAreas,
    payload.supportProfile.supportNeeds,
    payload.supportProfile.helpfulStrategies,
    payload.supportProfile.unhelpfulApproaches,
    payload.supportProfile.otherBackground,
    payload.supportProfile.ehcpStatus,
    payload.sessionPreferences.sessionLength,
    payload.sessionPreferences.sessionFrequency,
    payload.sessionPreferences.widerSupport,
    payload.confirmations.authorised,
    payload.confirmations.privacyAcknowledged,
    payload.confirmations.sensitiveDataAcknowledged,
    ACKNOWLEDGEMENT_VERSION,
    'Pending',
    '',
  ].map(text_);
}

function configuredSheet_(properties) {
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  const sheetName = properties.getProperty('SHEET_NAME');
  if (!spreadsheetId || !sheetName) throw new Error('Missing spreadsheet configuration');
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  if (!sheet) throw new Error('Configured sheet was not found');
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    const headerRange = sheet.getRange(1, 1, 1, SHEET_COLUMNS.length);
    headerRange.setNumberFormat('@');
    headerRange.setValues([SHEET_COLUMNS]);
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }
  const headers = sheet.getRange(1, 1, 1, SHEET_COLUMNS.length).getDisplayValues()[0];
  if (headers.join('\u001f') !== SHEET_COLUMNS.join('\u001f')) throw new Error('Sheet headers do not match the integration schema');
}

function findSubmissionRow_(sheet, submissionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const match = sheet.getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(submissionId)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : 0;
}

function appendSubmission_(sheet, row) {
  const targetRow = sheet.getLastRow() + 1;
  const range = sheet.getRange(targetRow, 1, 1, SHEET_COLUMNS.length);
  range.setNumberFormat('@');
  range.setValues([row]);
  return targetRow;
}

function testFlagEnabled_(properties, name) {
  return properties.getProperty('TEST_MODE') === 'true' && properties.getProperty(name) === 'true';
}

function sendMinimalNotification_(properties, receivedAt) {
  if (testFlagEnabled_(properties, 'FORCE_NOTIFICATION_FAILURE')) {
    throw new Error('Notification failure requested by isolated test configuration');
  }
  const recipient = properties.getProperty('NOTIFICATION_EMAIL');
  const privateSheetUrl = properties.getProperty('PRIVATE_SHEET_URL');
  if (!recipient || !privateSheetUrl) throw new Error('Missing notification configuration');
  MailApp.sendEmail({
    to: recipient,
    subject: 'New learner profile received',
    body: [
      `A new learner profile was received at ${receivedAt}.`,
      '',
      'Open the private response sheet:',
      privateSheetUrl,
      '',
      'This notification intentionally contains no learner or respondent answers.',
    ].join('\n'),
    name: 'The MentorSphere website',
  });
}

function doPost(event) {
  try {
    const raw = event && event.postData && typeof event.postData.contents === 'string'
      ? event.postData.contents
      : '';
    if (!raw || raw.length > MAX_REQUEST_CHARACTERS) return safeError_();

    const envelope = JSON.parse(raw);
    if (!isObject_(envelope) || typeof envelope.body !== 'string' || typeof envelope.signature !== 'string') return safeError_();

    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('HMAC_SECRET');
    if (!secret || !constantTimeEqual_(envelope.signature, expectedSignature_(envelope.body, secret))) return safeError_();

    const request = JSON.parse(envelope.body);
    if (!hasValidShape_(request)) return safeError_();
    if (testFlagEnabled_(properties, 'FORCE_REQUEST_FAILURE')) return safeError_();

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return safeError_();

    let sheet;
    let rowNumber;
    let duplicate = false;
    const receivedAt = new Date().toISOString();
    try {
      sheet = configuredSheet_(properties);
      ensureHeaders_(sheet);
      rowNumber = findSubmissionRow_(sheet, request.payload.submissionId);
      if (rowNumber > 0) duplicate = true;
      else rowNumber = appendSubmission_(sheet, rowFor_(request, receivedAt));
    } finally {
      lock.releaseLock();
    }

    if (duplicate) return jsonOutput_({ ok: true, status: 'duplicate' });

    const statusColumn = SHEET_COLUMNS.indexOf('Notification status') + 1;
    const sentAtColumn = SHEET_COLUMNS.indexOf('Notification sent at (UTC)') + 1;
    try {
      sendMinimalNotification_(properties, receivedAt);
      sheet.getRange(rowNumber, statusColumn).setValue('Sent');
      sheet.getRange(rowNumber, sentAtColumn).setValue(new Date().toISOString());
    } catch (notificationError) {
      sheet.getRange(rowNumber, statusColumn).setValue('Failed: review Apps Script executions');
    }

    return jsonOutput_({ ok: true, status: 'created' });
  } catch (error) {
    return safeError_();
  }
}
