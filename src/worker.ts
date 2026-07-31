import { generateGroundedAnswer, normaliseAssistantOutput } from "./assistant/openai";
import { buildModelInput, SYSTEM_INSTRUCTION } from "./assistant/prompt";
import { isReliableRetrieval, retrieveKnowledge, sourceLinks } from "./assistant/retrieval";
import { deterministicResponse } from "./assistant/safety";
import type { ChatResponse } from "./assistant/types";
import {
  isValidSessionId,
  type ChatRequestError,
  validateChatRequest,
} from "./assistant/validation";

export interface AssistantEnv extends Env {
  OPENAI_API_KEY?: string;
  OPENAI_PROJECT_ID?: string;
}

const API_PREFIX = "/api/assistant/";
const FALLBACK =
  "I could not find a reliable answer in the current MentorSphere information. Please contact Luke so your question can be answered accurately.";
const CONTACT_SOURCE = {
  title: "Contact The MentorSphere",
  url: "https://www.thementorsphere.co.uk/contact/",
} as const;
const ALLOWED_EVENTS = new Set([
  "chat_opened",
  "message_sent",
  "fallback_triggered",
  "source_link_clicked",
  "helpful_yes",
  "helpful_no",
  "technical_error",
]);

function apiHeaders(requestId: string): Headers {
  return new Headers({
    "Cache-Control": "no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Content-Type": "application/json; charset=utf-8",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Request-ID": requestId,
  });
}

function jsonResponse(body: unknown, status: number, requestId: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: apiHeaders(requestId),
  });
}

function isEnabled(env: AssistantEnv): boolean {
  return env.CHATBOT_ENABLED === "true";
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin === null || origin === new URL(request.url).origin;
}

function hasJsonContentType(request: Request): boolean {
  return request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json") ?? false;
}

function chatRequestError(error: ChatRequestError): string {
  if (error === "empty-message") return "Enter a message and try again.";
  if (error === "message-too-long") return "Keep each message to 600 characters or fewer.";
  if (error === "conversation-too-long") return "The conversation is too long. Restart and try again.";
  return "Invalid request.";
}

function isFallbackAnswer(answer: string): boolean {
  return answer.startsWith(
    "I could not find a reliable answer in the current MentorSphere information",
  );
}

function logEvent(event: string, requestId: string, environment: string, extra: Record<string, string> = {}): void {
  console.log(
    JSON.stringify({
      event,
      requestId,
      environment,
      ...extra,
    }),
  );
}

async function checkRateLimit(env: AssistantEnv, sessionId: string): Promise<boolean> {
  const result = await env.ASSISTANT_RATE_LIMITER.limit({ key: `assistant:${sessionId}` });
  return result.success;
}

async function handleConfig(env: AssistantEnv, requestId: string): Promise<Response> {
  return jsonResponse(
    {
      enabled: isEnabled(env),
      maxMessageLength: 600,
      maxConversationMessages: 7,
    },
    200,
    requestId,
  );
}

async function handleEvent(request: Request, env: AssistantEnv, requestId: string): Promise<Response> {
  if (!isEnabled(env)) return jsonResponse({ error: "Not found" }, 404, requestId);
  if (!isSameOrigin(request) || !hasJsonContentType(request)) {
    return jsonResponse({ error: "Invalid request" }, 400, requestId);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > 1_024) return jsonResponse({ error: "Request too large" }, 413, requestId);

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid request" }, 400, requestId);
  const candidate = body as { event?: unknown; sessionId?: unknown };
  if (
    typeof candidate.event !== "string" ||
    !ALLOWED_EVENTS.has(candidate.event) ||
    !isValidSessionId(candidate.sessionId)
  ) {
    return jsonResponse({ error: "Invalid request" }, 400, requestId);
  }

  const eventLimit = await env.ASSISTANT_EVENT_RATE_LIMITER.limit({
    key: `assistant-event:${candidate.sessionId}`,
  });
  const allowed = eventLimit.success;
  if (!allowed) return jsonResponse({ error: "Too many requests" }, 429, requestId);

  logEvent(candidate.event, requestId, env.ENVIRONMENT);
  return jsonResponse({ accepted: true }, 202, requestId);
}

async function handleChat(request: Request, env: AssistantEnv, requestId: string): Promise<Response> {
  if (!isEnabled(env)) return jsonResponse({ error: "Assistant unavailable" }, 503, requestId);
  if (!isSameOrigin(request) || !hasJsonContentType(request)) {
    return jsonResponse({ error: "Invalid request" }, 400, requestId);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > 16_384) return jsonResponse({ error: "Request too large" }, 413, requestId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400, requestId);
  }
  const validation = validateChatRequest(body);
  if (!validation.ok) {
    return jsonResponse({ error: chatRequestError(validation.error) }, 400, requestId);
  }
  const chatRequest = validation.request;

  if (!(await checkRateLimit(env, chatRequest.sessionId))) {
    return jsonResponse(
      { error: "Too many messages have been sent. Please wait a minute and try again." },
      429,
      requestId,
    );
  }

  const latestMessage = chatRequest.messages.at(-1);
  if (!latestMessage) return jsonResponse({ error: "Invalid request" }, 400, requestId);

  const fixed = deterministicResponse(latestMessage.content, chatRequest.messages);
  if (fixed) {
    logEvent(`assistant_${fixed.kind}`, requestId, env.ENVIRONMENT);
    return jsonResponse(fixed, 200, requestId);
  }

  const contextQuery = chatRequest.messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content)
    .join(" ");
  const retrieved = retrieveKnowledge(contextQuery);

  if (!isReliableRetrieval(retrieved)) {
    const response: ChatResponse = {
      answer: FALLBACK,
      sources: [CONTACT_SOURCE],
      kind: "fallback",
    };
    logEvent("assistant_fallback", requestId, env.ENVIRONMENT);
    return jsonResponse(response, 200, requestId);
  }

  if (env.AI_PROVIDER !== "openai" || !env.AI_MODEL || !env.OPENAI_API_KEY) {
    logEvent("assistant_configuration_error", requestId, env.ENVIRONMENT);
    return jsonResponse(
      { error: "The assistant is temporarily unavailable. Please use the contact page for help." },
      503,
      requestId,
    );
  }

  try {
    const answer = normaliseAssistantOutput(
      await generateGroundedAnswer({
        apiKey: env.OPENAI_API_KEY,
        projectId: env.OPENAI_PROJECT_ID,
        model: env.AI_MODEL,
        instructions: SYSTEM_INSTRUCTION,
        input: buildModelInput(chatRequest.messages, retrieved),
      }),
    );
    if (isFallbackAnswer(answer)) {
      const response: ChatResponse = {
        answer: FALLBACK,
        sources: [CONTACT_SOURCE],
        kind: "fallback",
      };
      logEvent("assistant_fallback", requestId, env.ENVIRONMENT);
      return jsonResponse(response, 200, requestId);
    }
    const response: ChatResponse = {
      answer,
      sources: sourceLinks(retrieved),
      kind: "answer",
    };
    logEvent("assistant_answer", requestId, env.ENVIRONMENT, {
      sourceCount: String(response.sources.length),
    });
    return jsonResponse(response, 200, requestId);
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError" ? "timeout" : "provider_error";
    console.error(
      JSON.stringify({
        event: "assistant_error",
        requestId,
        environment: env.ENVIRONMENT,
        reason,
      }),
    );
    return jsonResponse(
      { error: "The assistant could not respond just now. Please try again or use the contact page." },
      502,
      requestId,
    );
  }
}

async function handleApi(request: Request, env: AssistantEnv, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === `${API_PREFIX}config`) {
    return handleConfig(env, requestId);
  }
  if (request.method === "POST" && url.pathname === `${API_PREFIX}chat`) {
    return handleChat(request, env, requestId);
  }
  if (request.method === "POST" && url.pathname === `${API_PREFIX}event`) {
    return handleEvent(request, env, requestId);
  }
  return jsonResponse({ error: "Not found" }, 404, requestId);
}

export default {
  async fetch(request: Request, env: AssistantEnv): Promise<Response> {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    if (url.pathname.startsWith(API_PREFIX)) {
      try {
        return await handleApi(request, env, requestId);
      } catch {
        console.error(
          JSON.stringify({
            event: "assistant_unhandled_error",
            requestId,
            environment: env.ENVIRONMENT,
          }),
        );
        return jsonResponse({ error: "The assistant is temporarily unavailable." }, 500, requestId);
      }
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<AssistantEnv>;
