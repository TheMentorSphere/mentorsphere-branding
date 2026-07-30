interface OpenAIResponseContent {
  type?: unknown;
  text?: unknown;
}

interface OpenAIOutputItem {
  type?: unknown;
  content?: unknown;
}

interface OpenAIResponseBody {
  output?: unknown;
  error?: unknown;
}

export interface OpenAIRequestOptions {
  apiKey: string;
  projectId?: string;
  model: string;
  instructions: string;
  input: string;
  timeoutMs?: number;
}

export function createOpenAIRequestBody(options: OpenAIRequestOptions): Record<string, unknown> {
  return {
    model: options.model,
    instructions: options.instructions,
    input: options.input,
    max_output_tokens: 320,
    reasoning: { effort: "none" },
    text: { verbosity: "low" },
    store: false,
  };
}

function extractOutputText(body: OpenAIResponseBody): string {
  if (!Array.isArray(body.output)) return "";

  const parts: string[] = [];
  for (const rawItem of body.output) {
    if (!rawItem || typeof rawItem !== "object") continue;
    const item = rawItem as OpenAIOutputItem;
    if (!Array.isArray(item.content)) continue;
    for (const rawContent of item.content) {
      if (!rawContent || typeof rawContent !== "object") continue;
      const content = rawContent as OpenAIResponseContent;
      if (content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

export async function generateGroundedAnswer(options: OpenAIRequestOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  try {
    const headers = new Headers({
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    });
    if (options.projectId) headers.set("OpenAI-Project", options.projectId);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers,
      body: JSON.stringify(createOpenAIRequestBody(options)),
      signal: controller.signal,
    });

    const body: unknown = await response.json();
    if (!response.ok || !body || typeof body !== "object") {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const answer = extractOutputText(body as OpenAIResponseBody);
    if (!answer) throw new Error("OpenAI returned no output text");
    return answer.slice(0, 2_000);
  } finally {
    clearTimeout(timeout);
  }
}
