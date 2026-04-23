import { NextRequest } from "next/server";
import { getModel, calculateCost } from "@/lib/models";
import { callLLM, extractJsonObject } from "@/lib/llm";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts";
import { FinancialModel } from "@/lib/types";
import { computeModel } from "@/lib/compute";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const {
      model: financialModel,
      modelId,
      driverOverrides,
    } = (await request.json()) as {
      model: FinancialModel;
      modelId: string;
      driverOverrides?: Record<string, number[]>;
    };

    if (!financialModel || !modelId) {
      return Response.json(
        { error: "model and modelId are required" },
        { status: 400 }
      );
    }

    const aiModel = getModel(modelId);
    const computed = computeModel(financialModel, driverOverrides);

    const driversSummary = financialModel.drivers
      .map((d) => {
        const vals = computed.driverValues[d.id]
          .map((v) => (d.unit === "percent" ? `${(v * 100).toFixed(1)}%` : v))
          .join(", ");
        return `- ${d.id} (${d.label}, ${d.unit}): [${vals}]`;
      })
      .join("\n");

    const lineItemsSummary = computed.lineItems
      .map((li) => {
        const vals = li.values
          .map((v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }))
          .join(", ");
        return `- ${li.id} [${li.category}] ${li.label} = ${li.formula}  →  [${vals}]`;
      })
      .join("\n");

    const result = await callLLM(
      aiModel,
      ANALYZE_SYSTEM_PROMPT,
      `Analyze this driver-based financial model.

Title: ${financialModel.title}
Description: ${financialModel.description}
Periods: ${financialModel.periods.join(", ")}

Drivers (id, label, per-period values):
${driversSummary}

Line items (id, category, formula, computed values):
${lineItemsSummary}

Assumptions:
${financialModel.assumptions.map((a) => `- ${a}`).join("\n")}`,
      { json: true, maxTokens: 4096 }
    );

    const durationMs = Date.now() - startTime;
    const estimatedCost = calculateCost(
      aiModel,
      result.inputTokens,
      result.outputTokens
    );

    let analysis: Record<string, unknown>;
    try {
      analysis = extractJsonObject<Record<string, unknown>>(result.content);
    } catch (err) {
      return Response.json(
        {
          error: `Failed to parse analysis output: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
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

