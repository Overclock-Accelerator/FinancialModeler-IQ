import { NextRequest } from "next/server";
import { getModel, calculateCost } from "@/lib/models";
import { callLLM } from "@/lib/llm";
import { GENERATE_SYSTEM_PROMPT } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { prompt, modelId } = await request.json();

    if (!prompt || !modelId) {
      return Response.json(
        { error: "prompt and modelId are required" },
        { status: 400 }
      );
    }

    const model = getModel(modelId);
    const result = await callLLM(
      model,
      GENERATE_SYSTEM_PROMPT,
      `Generate a detailed 3-year financial model for the following business:\n\n${prompt}`
    );

    const durationMs = Date.now() - startTime;
    const estimatedCost = calculateCost(
      model,
      result.inputTokens,
      result.outputTokens
    );

    let parsedModel;
    try {
      parsedModel = JSON.parse(result.content);
    } catch {
      return Response.json(
        { error: "Failed to parse model output. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      model: {
        ...parsedModel,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
      metrics: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        estimatedCost,
        durationMs,
        model: model.name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
