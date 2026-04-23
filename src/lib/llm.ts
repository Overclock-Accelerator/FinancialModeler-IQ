import { AIModel } from "./types";

interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

interface CallOptions {
  json?: boolean;
  maxTokens?: number;
}

export async function callLLM(
  model: AIModel,
  systemPrompt: string,
  userPrompt: string,
  options: CallOptions = {}
): Promise<LLMResponse> {
  const maxTokens = options.maxTokens ?? 8192;
  switch (model.provider) {
    case "anthropic":
      return callAnthropic(model, systemPrompt, userPrompt, maxTokens);
    case "openai":
      return callOpenAI(
        model,
        systemPrompt,
        userPrompt,
        maxTokens,
        options.json
      );
    case "openrouter":
      return callOpenRouter(
        model,
        systemPrompt,
        userPrompt,
        maxTokens,
        options.json
      );
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

async function callAnthropic(
  model: AIModel,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model.modelId,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    content: data.content[0].text,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
  };
}

async function callOpenAI(
  model: AIModel,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  json?: boolean
): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const body: Record<string, unknown> = {
    model: model.modelId,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage.prompt_tokens,
    outputTokens: data.usage.completion_tokens,
  };
}

async function callOpenRouter(
  model: AIModel,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  json?: boolean
): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const body: Record<string, unknown> = {
    model: model.modelId,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };
  if (json) body.response_format = { type: "json_object" };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "FinancialModeler IQ",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

/**
 * Pull a JSON object out of an LLM response.
 *
 * Tolerates: leading/trailing prose, ```json fences, or a bare JSON object.
 * Strategy: strip fences, then find the first `{` and its matching `}` by
 * bracket counting (skipping string contents), and parse that slice.
 */
export function extractJsonObject<T = unknown>(raw: string): T {
  let s = raw.trim();

  if (s.startsWith("```")) {
    s = s
      .replace(/^```(?:json|JSON)?\s*/i, "")
      .replace(/```[\s\S]*$/, "")
      .trim();
  }

  // Fast path: it's already a JSON object.
  if (s.startsWith("{")) {
    try {
      return JSON.parse(s) as T;
    } catch {
      // fall through to bracket scan
    }
  }

  const start = s.indexOf("{");
  if (start === -1) {
    throw new Error(
      `No JSON object found in response. First 200 chars: ${s.slice(0, 200)}`
    );
  }

  let depth = 0;
  let inString = false;
  let stringChar = "";
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = s.slice(start, i + 1);
        try {
          return JSON.parse(slice) as T;
        } catch (err) {
          throw new Error(
            `Extracted JSON slice failed to parse: ${
              err instanceof Error ? err.message : String(err)
            }. First 200 chars: ${slice.slice(0, 200)}`
          );
        }
      }
    }
  }

  throw new Error(
    `Unterminated JSON in response (likely truncated — increase max_tokens). Last 200 chars: ${s.slice(
      -200
    )}`
  );
}
