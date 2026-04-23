import { NextRequest } from "next/server";
import { getModel, calculateCost } from "@/lib/models";
import { callLLM } from "@/lib/llm";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import { FinancialModel } from "@/lib/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { model: financialModel, modelId } = (await request.json()) as {
      model: FinancialModel;
      modelId: string;
    };

    if (!financialModel || !modelId) {
      return Response.json(
        { error: "model and modelId are required" },
        { status: 400 }
      );
    }

    const aiModel = getModel(modelId);
    const result = await callLLM(
      aiModel,
      ANALYZE_SYSTEM_PROMPT,
      `Analyze the following financial model:\n\nTitle: ${financialModel.title}\nDescription: ${financialModel.description}\n\nAssumptions:\n${financialModel.assumptions.join("\n")}\n\nFinancial Data:\n${JSON.stringify(financialModel.rows, null, 2)}`
    );

    const durationMs = Date.now() - startTime;
    const estimatedCost = calculateCost(
      aiModel,
      result.inputTokens,
      result.outputTokens
    );

    let analysis;
    try {
      analysis = JSON.parse(result.content);
    } catch {
      return Response.json(
        { error: "Failed to parse analysis output. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      analysis: {
        ...analysis,
        metrics: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.inputTokens + result.outputTokens,
          estimatedCost,
          durationMs,
          model: aiModel.name,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
