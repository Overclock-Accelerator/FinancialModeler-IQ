import { NextRequest } from "next/server";
import { getModel, calculateCost } from "@/lib/models";
import { callLLM } from "@/lib/llm";
import { EDIT_SYSTEM_PROMPT } from "@/lib/prompts";
import { computeModel, validateModelShape } from "@/lib/compute";
import { AnalysisResult, ChatMessage, FinancialModel, ResearchResult } from "@/lib/types";

const MAX_HISTORY = 6;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const {
      currentModel,
      driverOverrides,
      history,
      message,
      modelId,
      analysis,
      research,
    }: {
      currentModel: FinancialModel;
      driverOverrides: Record<string, number[]>;
      history: ChatMessage[];
      message: string;
      modelId: string;
      analysis?: AnalysisResult | null;
      research?: ResearchResult | null;
    } = await request.json();

    if (!currentModel || !message || !modelId) {
      return Response.json(
        { error: "currentModel, message, and modelId are required" },
        { status: 400 }
      );
    }

    const aiModel = getModel(modelId);

    // Bake current driver overrides into the model snapshot so the LLM
    // sees exactly what the user sees (same as handleShare logic in page.tsx).
    const snapshotModel: FinancialModel = {
      ...currentModel,
      drivers: currentModel.drivers.map((d) => ({
        ...d,
        values: driverOverrides[d.id] ?? d.values,
      })),
    };

    // Build the trimmed conversation history (cap to avoid runaway token use).
    const recentHistory = history.slice(-MAX_HISTORY);
    const historyText =
      recentHistory.length > 0
        ? recentHistory
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n\n")
        : "";

    const analysisContext = analysis
      ? [
          "\n--- ANALYSIS (already run on this model) ---",
          `Summary: ${analysis.summary}`,
          `Strengths: ${analysis.strengths.join("; ")}`,
          `Risks: ${analysis.risks.join("; ")}`,
          `Suggestions: ${analysis.suggestions.join("; ")}`,
          "--- END ANALYSIS ---",
        ].join("\n")
      : "";

    const researchContext = research
      ? [
          "\n--- RESEARCH BENCHMARKS (already fetched for this model) ---",
          `Summary: ${research.summary}`,
          `Benchmarks: ${research.benchmarks.map((b) => `${b.metric}: ${b.value} (${b.source})`).join("; ")}`,
          `Suggested adjustments: ${research.adjustments.join("; ")}`,
          "--- END RESEARCH ---",
        ].join("\n")
      : "";

    const userPrompt = [
      "Here is the current financial model (JSON):",
      "```json",
      JSON.stringify(snapshotModel, null, 2),
      "```",
      analysisContext,
      researchContext,
      historyText ? `\nConversation so far:\n${historyText}` : "",
      `\nUser request: ${message}`,
      "\nApply the requested change and return the full updated model in the required JSON format.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await callLLM(aiModel, EDIT_SYSTEM_PROMPT, userPrompt, {
      maxTokens: 10000,
    });

    const durationMs = Date.now() - startTime;
    const estimatedCost = calculateCost(
      aiModel,
      result.inputTokens,
      result.outputTokens
    );

    // Parse the outer envelope { message, model }
    let parsed: { message: string; model: unknown };
    try {
      const raw = result.content.trim();
      const stripped = raw.startsWith("```")
        ? raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim()
        : raw;
      parsed = JSON.parse(stripped);
    } catch {
      return Response.json(
        { error: "LLM did not return valid JSON. Please try again." },
        { status: 500 }
      );
    }

    if (!parsed.model || !parsed.message) {
      return Response.json(
        { error: "LLM response missing 'message' or 'model' fields." },
        { status: 500 }
      );
    }

    // Validate and recompute — same guards as /api/generate.
    let financialModel: FinancialModel;
    try {
      financialModel = validateModelShape(parsed.model);
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

    // Preserve id and createdAt from the original.
    financialModel.id = currentModel.id;
    financialModel.createdAt = currentModel.createdAt;

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
      message: parsed.message,
      model: financialModel,
      metrics: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        estimatedCost,
        durationMs,
        model: aiModel.name,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
