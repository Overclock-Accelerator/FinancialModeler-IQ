import { NextRequest } from "next/server";
import { getModel } from "@/lib/models";
import { callLLM } from "@/lib/llm";
import { SAMPLE_PROMPT_SYSTEM_PROMPT } from "@/lib/prompts";

function normalizeSamplePrompt(raw: string): string {
  let s = raw.trim();
  const fenced = /^```(?:[a-z]*\n)?([\s\S]*?)```$/im.exec(s);
  if (fenced) s = fenced[1].trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const SAMPLE_PROMPT_MODEL_ID = "gpt-4-1-nano";

export async function POST(_request: NextRequest) {
  try {
    const model = getModel(SAMPLE_PROMPT_MODEL_ID);
    const seed = `${crypto.randomUUID()}-${Date.now()}`;

    const result = await callLLM(
      model,
      SAMPLE_PROMPT_SYSTEM_PROMPT,
      `Create a new fictional business description for a 3-year financial projection. Randomization seed (for variety): ${seed}`
    );

    const prompt = normalizeSamplePrompt(result.content);
    if (!prompt) {
      return Response.json(
        { error: "Model returned an empty prompt. Try again." },
        { status: 500 }
      );
    }

    return Response.json({ prompt });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
