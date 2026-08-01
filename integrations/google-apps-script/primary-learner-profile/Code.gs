const FORM_VERSION = 'primary-learner-profile-v5';
const CONTACT_METHODS = ['Email', 'Telephone', 'Text message', 'WhatsApp'];
const PHONE_CONTACT_METHODS = ['Telephone', 'Text message', 'WhatsApp'];
const CONSENT_WORDING_VERSION = 'explicit-consent-v5-2026-08-01';
const AUTHORITY_WORDING_VERSION = 'special-category-authority-v5-2026-08-01';
const LEARNER_CONSENT_ROUTE_WORDING_VERSION = 'learner-consent-route-v5-2026-08-01';
const LEARNER_CONSENT_ROUTES = [
  'The learner understands how this information will be used and has authorised me to communicate this consent on their behalf.',
  'The learner is not currently able to understand and give informed consent to this use of their information, so I am giving consent as a person with parental responsibility or documented legal authority.',
];
const MAX_REQUEST_CHARACTERS = 50000;
const SIGNATURE_WINDOW_MILLISECONDS = 5 * 60 * 1000;
const DUPLICATE_CACHE_SECONDS = 6 * 60 * 60;

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
  'Preferred contact methods',
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
  'Special-category information provided',
  'Explicit consent',
  'Explicit consent wording version',
  'Consent recorded at (UTC)',
  'Parental responsibility or documented authority',
  'Authority wording version',
  'Learner consent route',
  'Learner consent route wording version',
  'Special-category consent status',
  'Consent withdrawn at (UTC)',
  'Notification status',
  'Notification sent at (UTC)',
  'Record status',
  'Last meaningful contact date',
  'Retention review date',
  'Safeguarding or legal hold',
  'Retention notes',
];

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function safeError_() {
  return jsonOutput_({ success: false, stored: false, status: 'rejected' });
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
  if (!isObject_(payload.respondent) || !isObject_(payload.learner) ||
    !isObject_(payload.supportProfile) || !isObject_(payload.sessionPreferences) ||
    !isObject_(payload.confirmations)) return false;
  const specialCategoryProvided = payload.supportProfile.specialCategoryProvided === true;
  const relationshipAllowsSpecialCategory =
    ['Parent', 'Guardian or carer'].indexOf(payload.respondent.relationship) >= 0;
  const structuredSpecialCategoryIsBlank =
    payload.supportProfile.needsStatus === '' &&
    Array.isArray(payload.supportProfile.relevantAreas) && payload.supportProfile.relevantAreas.length === 0 &&
    payload.supportProfile.ehcpStatus === '';
  const supportDetailIsBlank =
    payload.supportProfile.supportNeeds === '' &&
    payload.supportProfile.helpfulStrategies === '' &&
    payload.supportProfile.unhelpfulApproaches === '' &&
    payload.supportProfile.otherBackground === '';
  const preferredContactMethods = payload.respondent.preferredContactMethods;
  const contactMethodsAreValid = Array.isArray(preferredContactMethods) &&
    preferredContactMethods.length > 0 &&
    preferredContactMethods.every((method) => CONTACT_METHODS.indexOf(method) >= 0) &&
    new Set(preferredContactMethods).size === preferredContactMethods.length;
  const mobileIsRequired = contactMethodsAreValid &&
    preferredContactMethods.some((method) => PHONE_CONTACT_METHODS.indexOf(method) >= 0);
  const mobileShapeIsValid = !mobileIsRequired ||
    (typeof payload.respondent.mobile === 'string' && payload.respondent.mobile.trim() !== '');
  const relationshipShapeIsValid = relationshipAllowsSpecialCategory || supportDetailIsBlank;
  const learnerConsentRouteIsValid =
    LEARNER_CONSENT_ROUTES.indexOf(payload.confirmations.learnerConsentRoute) >= 0;
  const consentShapeIsValid = specialCategoryProvided
    ? relationshipAllowsSpecialCategory &&
      payload.confirmations.specialCategoryConsent === true &&
      payload.confirmations.specialCategoryAuthority === true &&
      learnerConsentRouteIsValid
    : structuredSpecialCategoryIsBlank &&
      supportDetailIsBlank &&
      payload.confirmations.specialCategoryConsent === false &&
      payload.confirmations.specialCategoryAuthority === false &&
      payload.confirmations.learnerConsentRoute === '';
  return payload.formVersion === FORM_VERSION &&
    typeof payload.submissionId === 'string' &&
    /^[0-9a-f-]{36}$/iu.test(payload.submissionId) &&
    payload.confirmations.authorised === true &&
    payload.confirmations.privacyAcknowledged === true &&
    typeof payload.supportProfile.specialCategoryProvided === 'boolean' &&
    contactMethodsAreValid &&
    mobileShapeIsValid &&
    relationshipShapeIsValid &&
    consentShapeIsValid;
}

function text_(value) {
  if (Array.isArray(value)) return value.map(text_).filter(Boolean).join(' | ');
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  return /^[=+\-@]/u.test(text) ? `'${text}` : text;
}

function canonicalContactMethods_(values) {
  return CONTACT_METHODS.filter((method) => values.indexOf(method) >= 0).join('; ');
}

function retentionReviewDate_(receivedAt) {
  const receivedDate = new Date(receivedAt);
  if (!Number.isFinite(receivedDate.getTime())) throw new Error('Invalid received date');
  const originalDay = receivedDate.getUTCDate();
  receivedDate.setUTCDate(1);
  receivedDate.setUTCMonth(receivedDate.getUTCMonth() + 6);
  const lastDayOfTargetMonth = new Date(Date.UTC(
    receivedDate.getUTCFullYear(),
    receivedDate.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  receivedDate.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return receivedDate.toISOString().slice(0, 10);
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
    canonicalContactMethods_(payload.respondent.preferredContactMethods),
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
    payload.supportProfile.specialCategoryProvided,
    payload.confirmations.specialCategoryConsent,
    payload.supportProfile.specialCategoryProvided ? CONSENT_WORDING_VERSION : '',
    payload.supportProfile.specialCategoryProvided ? receivedAt : '',
    payload.confirmations.specialCategoryAuthority,
    payload.supportProfile.specialCategoryProvided ? AUTHORITY_WORDING_VERSION : '',
    payload.supportProfile.specialCategoryProvided ? payload.confirmations.learnerConsentRoute : '',
    payload.supportProfile.specialCategoryProvided ? LEARNER_CONSENT_ROUTE_WORDING_VERSION : '',
    payload.supportProfile.specialCategoryProvided ? 'Active' : 'Not applicable',
    '',
    'Pending',
    '',
    'Prospective',
    receivedAt.slice(0, 10),
    retentionReviewDate_(receivedAt),
    'No',
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

function duplicateCacheKey_(submissionId) {
  return `stored:${submissionId}`;
}

function verifyStoredRow_(sheet, rowNumber, submissionId) {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) return false;
  const storedRow = sheet.getRange(rowNumber, 1, 1, SHEET_COLUMNS.length).getValues()[0];
  return Array.isArray(storedRow) &&
    storedRow.length === SHEET_COLUMNS.length &&
    String(storedRow[0]) === submissionId;
}

function classifyDuplicate_(sheet, submissionId, cache) {
  const rowNumber = findSubmissionRow_(sheet, submissionId);
  if (rowNumber > 0) {
    return verifyStoredRow_(sheet, rowNumber, submissionId)
      ? { status: 'duplicate', rowNumber }
      : { status: 'duplicate_without_record', rowNumber: 0 };
  }
  if (cache.get(duplicateCacheKey_(submissionId)) === 'stored') {
    return { status: 'duplicate_without_record', rowNumber: 0 };
  }
  return { status: 'new', rowNumber: 0 };
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

    const cache = CacheService.getScriptCache();
    let sheet;
    let rowNumber = 0;
    let duplicateStatus = 'new';
    const receivedAt = new Date().toISOString();
    try {
      sheet = configuredSheet_(properties);
      ensureHeaders_(sheet);
      const duplicateResult = classifyDuplicate_(sheet, request.payload.submissionId, cache);
      duplicateStatus = duplicateResult.status;
      rowNumber = duplicateResult.rowNumber;
      if (duplicateStatus === 'duplicate') {
        cache.put(duplicateCacheKey_(request.payload.submissionId), 'stored', DUPLICATE_CACHE_SECONDS);
      } else if (duplicateStatus === 'new') {
        const row = rowFor_(request, receivedAt);
        if (row.length !== SHEET_COLUMNS.length) throw new Error('Row mapping does not match schema');
        rowNumber = appendSubmission_(sheet, row);
        SpreadsheetApp.flush();
        if (!verifyStoredRow_(sheet, rowNumber, request.payload.submissionId)) {
          throw new Error('Stored row could not be verified');
        }
        cache.put(duplicateCacheKey_(request.payload.submissionId), 'stored', DUPLICATE_CACHE_SECONDS);
      }
    } finally {
      lock.releaseLock();
    }

    if (duplicateStatus === 'duplicate') {
      return jsonOutput_({
        success: true,
        stored: false,
        status: 'duplicate',
        existingRecordVerified: true,
      });
    }
    if (duplicateStatus === 'duplicate_without_record') {
      return jsonOutput_({ success: false, stored: false, status: 'duplicate_without_record' });
    }

    const statusColumn = SHEET_COLUMNS.indexOf('Notification status') + 1;
    const sentAtColumn = SHEET_COLUMNS.indexOf('Notification sent at (UTC)') + 1;
    let notificationSent = false;
    try {
      sendMinimalNotification_(properties, receivedAt);
      sheet.getRange(rowNumber, statusColumn).setValue('Sent');
      sheet.getRange(rowNumber, sentAtColumn).setValue(new Date().toISOString());
      SpreadsheetApp.flush();
      notificationSent = true;
    } catch (notificationError) {
      sheet.getRange(rowNumber, statusColumn).setValue('Failed: review Apps Script executions');
      SpreadsheetApp.flush();
    }

    return jsonOutput_({ success: true, stored: true, status: 'created', notificationSent });
  } catch (error) {
    return safeError_();
  }
}
