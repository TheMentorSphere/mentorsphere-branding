export const PRE_FORWARD_ERROR_CODES = [
  "SUBMISSIONS_DISABLED",
  "INVALID_ORIGIN",
  "INVALID_CONTENT_TYPE",
  "REQUEST_TOO_LARGE",
  "REQUEST_BODY_UNREADABLE",
  "INVALID_JSON",
  "PAYLOAD_NOT_OBJECT",
  "INVALID_FORM_VERSION",
  "PAYLOAD_VALIDATION_FAILED",
  "INVALID_SUBMISSION_ID",
  "TURNSTILE_TOKEN_MISSING",
  "HONEYPOT_REJECTED",
  "TURNSTILE_RESPONSE_INVALID",
  "TURNSTILE_VERIFICATION_FAILED",
  "TURNSTILE_HOSTNAME_MISMATCH",
  "TURNSTILE_ACTION_MISMATCH",
  "TURNSTILE_INTERNAL_ERROR",
  "UNKNOWN_PREFORWARD_REJECTION",
] as const;

export type PreForwardErrorCode = (typeof PRE_FORWARD_ERROR_CODES)[number];

export type PreForwardStage =
  | "release_gate"
  | "origin_validation"
  | "content_type_validation"
  | "request_reading"
  | "json_parsing"
  | "payload_validation"
  | "honeypot_validation"
  | "turnstile_verification"
  | "turnstile_response_validation"
  | "turnstile_action_validation"
  | "turnstile_hostname_validation"
  | "unknown_preforward";

export const DIAGNOSTIC_LOG_KEYS = [
  "event",
  "requestId",
  "errorCode",
  "stage",
  "httpStatus",
  "timestamp",
  "requestParsingCompleted",
  "schemaValidationCompleted",
  "turnstileAttempted",
  "turnstileReturnedSuccess",
  "turnstileErrorCodes",
  "hostnameComparisonPassed",
  "actionComparisonPassed",
  "forwardingAttempted",
] as const;

export function logPreForwardDiagnostic(
  requestId: string,
  errorCode: PreForwardErrorCode,
  stage: PreForwardStage,
  httpStatus: number,
  timestamp: string,
  requestParsingCompleted: boolean,
  schemaValidationCompleted: boolean,
  turnstileAttempted: boolean,
  turnstileReturnedSuccess: boolean | null,
  turnstileErrorCodes: string,
  hostnameComparisonPassed: boolean | null,
  actionComparisonPassed: boolean | null,
  forwardingAttempted: boolean,
): void {
  console.warn({
    event: "intake_preforward_rejection",
    requestId,
    errorCode,
    stage,
    httpStatus,
    timestamp,
    requestParsingCompleted,
    schemaValidationCompleted,
    turnstileAttempted,
    turnstileReturnedSuccess,
    turnstileErrorCodes,
    hostnameComparisonPassed,
    actionComparisonPassed,
    forwardingAttempted,
  });
}
