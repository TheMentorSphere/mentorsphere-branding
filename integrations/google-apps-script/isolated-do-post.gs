// Shared by the generated Secondary and ADHD receivers only. Never installed in Primary.
function rememberVerifiedSubmission_(cache, submissionId) {
  try {
    if (cache) cache.put(duplicateCacheKey_(submissionId), 'stored', DUPLICATE_CACHE_SECONDS);
  } catch (cacheError) {
    // The verified Sheet row is authoritative; a cache write is only an optimisation.
  }
}

function updateNotificationStatus_(sheet, rowNumber, status, sentAt) {
  try {
    sheet.getRange(rowNumber, SHEET_COLUMNS.indexOf('Notification sent at (UTC)') + 1).setValue(sentAt);
    sheet.getRange(rowNumber, SHEET_COLUMNS.indexOf('Notification status') + 1).setValue(status);
    SpreadsheetApp.flush();
  } catch (statusError) {
    // Administrative cells are best effort after the exact submission is committed.
    // Do not log exceptions: service errors can contain submitted data.
  }
}

function doPost(event) {
  let accepted = null;
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
    let rowNumber = 0;
    let duplicateStatus = 'new';
    const receivedAt = new Date().toISOString();
    try {
      let cache = null;
      try { cache = CacheService.getScriptCache(); } catch (cacheError) { /* Sheet lookup still runs. */ }
      sheet = configuredSheet_(properties);
      ensureHeaders_(sheet);
      const duplicateResult = classifyDuplicate_(sheet, request.payload.submissionId, cache, request);
      duplicateStatus = duplicateResult.status;
      rowNumber = duplicateResult.rowNumber;
      if (duplicateStatus === 'duplicate') {
        accepted = { success: true, stored: false, status: 'duplicate', existingRecordVerified: true };
      } else if (duplicateStatus === 'new') {
        const row = rowFor_(request, receivedAt);
        if (row.length !== SHEET_COLUMNS.length) throw new Error('Row mapping does not match schema');
        rowNumber = appendSubmission_(sheet, row);
        SpreadsheetApp.flush();
        if (!verifyStoredRow_(sheet, rowNumber, request.payload.submissionId) || !verifyStoredPayload_(sheet, rowNumber, request)) {
          throw new Error('Stored row could not be verified');
        }
        // Commit point: no subsequent cache, lock, mail or status error may erase this result.
        accepted = { success: true, stored: true, status: 'created', notificationSent: false };
      }
      if (accepted) rememberVerifiedSubmission_(cache, request.payload.submissionId);
    } finally {
      try { lock.releaseLock(); } catch (lockError) {
        if (!accepted) throw lockError;
      }
    }

    if (duplicateStatus === 'duplicate') return jsonOutput_(accepted);
    if (duplicateStatus === 'duplicate_conflict') {
      return jsonOutput_({ success: false, stored: false, status: 'duplicate_conflict' });
    }
    if (duplicateStatus === 'duplicate_without_record') {
      return jsonOutput_({ success: false, stored: false, status: 'duplicate_without_record' });
    }

    // Isolated test mode suppresses real mail unless testing its forced failure path.
    if (properties.getProperty('TEST_MODE') === 'true' && !testFlagEnabled_(properties, 'FORCE_NOTIFICATION_FAILURE')) {
      updateNotificationStatus_(sheet, rowNumber, 'Disabled: isolated test', '');
      return jsonOutput_(accepted);
    }
    try {
      sendMinimalNotification_(properties, receivedAt);
      accepted.notificationSent = true;
    } catch (notificationError) {
      // A notification failure does not change the confirmed storage result.
    }
    updateNotificationStatus_(sheet, rowNumber,
      accepted.notificationSent ? 'Sent' : 'Failed: review Apps Script executions',
      accepted.notificationSent ? new Date().toISOString() : '');
    return jsonOutput_(accepted);
  } catch (error) {
    // Pre-commit failures remain closed; post-commit failures preserve the receipt.
    return accepted ? jsonOutput_(accepted) : safeError_();
  }
}
