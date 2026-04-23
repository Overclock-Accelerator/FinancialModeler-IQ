import { NextRequest } from "next/server";
import { getModel, calculateCost } from "@/lib/models";
import { callLLM, extractJsonObject } from "@/lib/llm";
import { RESEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
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

    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) throw new Error("TAVILY_API_KEY not set");

    const searchQuery = `${financialModel.title} ${financialModel.description} industry financial benchmarks average revenue costs margins`;

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: searchQuery,
        search_depth: "advanced",
        max_results: 8,
        include_answer: true,
      }),
    });

    if (!tavilyRes.ok) {
      const err = await tavilyRes.text();
      throw new Error(`Tavily API error: ${tavilyRes.status} ${err}`);
    }

    const tavilyData = await tavilyRes.json();

    const aiModel = getModel(modelId);
    const computed = computeModel(financialModel, driverOverrides);

    const summaryRows = computed.lineItems
      .filter((li) => li.category === "Summary")
      .map(
        (li) =>
          `- ${li.label} = ${li.formula}  →  [${li.values
            .map((v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 }))
            .join(", ")}]`
      )
      .join("\n");

    const driversList = financialModel.drivers
      .map(
        (d) =>
          `- ${d.id} (${d.label}): [${d.values.join(", ")}] ${d.unit === "percent" ? "(decimal %)" : ""}`
      )
      .join("\n");

    const researchContext = `Tavily Research Results:\n\nAnswer: ${
      tavilyData.answer || "No direct answer"
    }\n\nSources:\n${(tavilyData.results ?? [])
      .map(
        (r: { title: string; url: string; content: string }) =>
          `- ${r.title} (${r.url}): ${r.content}`
      )
      .join("\n\n")}`;

    const result = await callLLM(
      aiModel,
      RESEARCH_SYSTEM_PROMPT,
      `Extract benchmarks and adjustment suggestions for this driver-based model.

Business: ${financialModel.title} — ${financialModel.description}

Drivers:
${driversList}

Summary P&L rows:
${summaryRows}

Current assumptions:
${financialModel.assumptions.map((a) => `- ${a}`).join("\n")}

${researchContext}`,
      { json: true, maxTokens: 4096 }
    );

    const durationMs = Date.now() - startTime;
    const estimatedCost = calculateCost(
      aiModel,
      result.inputTokens,
      result.outputTokens
    );

    let research: Record<string, unknown>;
    try {
      research = extractJsonObject<Record<string, unknown>>(result.content);
    } catch (err) {
      return Response.json(
        {
          error: `Failed to parse research output: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
        { status: 500 }
      );
    }

    return Response.json({
      research: {
        ...research,
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

