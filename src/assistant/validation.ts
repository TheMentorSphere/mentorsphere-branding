import type { ChatMessage, ChatRequest } from "./types";

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGES = 7;
const MAX_MESSAGE_LENGTH = 600;
const MAX_TOTAL_LENGTH = 3_000;

export type ChatRequestError =
  | "invalid-request"
  | "empty-message"
  | "message-too-long"
  | "conversation-too-long";

export type ChatRequestValidation =
  | { ok: true; request: ChatRequest }
  | { ok: false; error: ChatRequestError };

export function validateChatRequest(value: unknown): ChatRequestValidation {
  if (!value || typeof value !== "object") return { ok: false, error: "invalid-request" };
  const candidate = value as { sessionId?: unknown; messages?: unknown };
  if (typeof candidate.sessionId !== "string" || !SESSION_ID.test(candidate.sessionId)) {
    return { ok: false, error: "invalid-request" };
  }
  if (!Array.isArray(candidate.messages) || candidate.messages.length < 1 || candidate.messages.length > MAX_MESSAGES) {
    return { ok: false, error: "invalid-request" };
  }

  const messages: ChatMessage[] = [];
  for (const rawMessage of candidate.messages) {
    if (!rawMessage || typeof rawMessage !== "object") {
      return { ok: false, error: "invalid-request" };
    }
    const message = rawMessage as { role?: unknown; content?: unknown };
    if (
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string"
    ) {
      return { ok: false, error: "invalid-request" };
    }
    if (message.content.trim().length === 0) {
      return { ok: false, error: "empty-message" };
    }
    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, error: "message-too-long" };
    }
    messages.push({
      role: message.role,
      content: message.content.trim(),
    });
  }

  if (messages.at(-1)?.role !== "user") return { ok: false, error: "invalid-request" };
  const totalLength = messages.reduce((total, message) => total + message.content.length, 0);
  if (totalLength > MAX_TOTAL_LENGTH) {
    return { ok: false, error: "conversation-too-long" };
  }

  return {
    ok: true,
    request: {
      sessionId: candidate.sessionId,
      messages,
    },
  };
}

export function parseChatRequest(value: unknown): ChatRequest | null {
  const result = validateChatRequest(value);
  return result.ok ? result.request : null;
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID.test(value);
}
