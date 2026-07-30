import type { ChatMessage, ChatRequest } from "./types";

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGES = 7;
const MAX_MESSAGE_LENGTH = 600;
const MAX_TOTAL_LENGTH = 3_000;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { role?: unknown; content?: unknown };
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0 &&
    candidate.content.length <= MAX_MESSAGE_LENGTH
  );
}

export function parseChatRequest(value: unknown): ChatRequest | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { sessionId?: unknown; messages?: unknown };
  if (typeof candidate.sessionId !== "string" || !SESSION_ID.test(candidate.sessionId)) return null;
  if (!Array.isArray(candidate.messages) || candidate.messages.length < 1 || candidate.messages.length > MAX_MESSAGES) {
    return null;
  }
  if (!candidate.messages.every(isChatMessage)) return null;
  if (candidate.messages.at(-1)?.role !== "user") return null;
  const totalLength = candidate.messages.reduce((total, message) => total + message.content.length, 0);
  if (totalLength > MAX_TOTAL_LENGTH) return null;

  return {
    sessionId: candidate.sessionId,
    messages: candidate.messages.map((message) => ({
      role: message.role,
      content: message.content.trim(),
    })),
  };
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID.test(value);
}
