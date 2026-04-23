import { NextRequest } from "next/server";
import { getModel, calculateCost } from "@/lib/models";
import { callLLM, extractJsonObject } from "@/lib/llm";
import { GENERATE_SYSTEM_PROMPT } from "@/lib/prompts";
import { computeModel, validateModelShape } from "@/lib/compute";

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
      `Build a driver-based financial model for this business. Remember: drivers are tunable inputs, line items are formula-driven outputs, and every yearly P&L number must come from a formula (never hardcoded in a line item's values).\n\nBusiness:\n${prompt}`,
      { json: true, maxTokens: 8192 }
    );

    const durationMs = Date.now() - startTime;
    const estimatedCost = calculateCost(
      model,
      result.inputTokens,
      result.outputTokens
    );

    let parsed: unknown;
    try {
      parsed = extractJsonObject(result.content);
    } catch (err) {
      return Response.json(
        {
          error: `LLM did not return valid JSON: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        { status: 500 }
      );
    }

    let financialModel;
    try {
      financialModel = validateModelShape(parsed);
    } catch (err) {
      return Response.json(
        {
          error: `Model validation failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        { status: 500 }
      );
    }

    financialModel.id = crypto.randomUUID();
    financialModel.createdAt = new Date().toISOString();

    try {
      computeModel(financialModel);
    } catch (err) {
      return Response.json(
        {
          error: `Formula evaluation failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        { status: 500 }
      );
    }

    return Response.json({
      model: financialModel,
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

