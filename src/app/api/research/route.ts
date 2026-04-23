import { NextRequest } from "next/server";
import { getModel, calculateCost } from "@/lib/models";
import { callLLM } from "@/lib/llm";
import { RESEARCH_SYSTEM_PROMPT } from "@/lib/prompts";
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

    // Step 1: Search Tavily for industry benchmarks
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

    // Step 2: Use LLM to synthesize research into structured benchmarks
    const aiModel = getModel(modelId);
    const researchContext = `Tavily Research Results:\n\nAnswer: ${tavilyData.answer || "No direct answer"}\n\nSources:\n${tavilyData.results
      .map(
        (r: { title: string; url: string; content: string }) =>
          `- ${r.title} (${r.url}): ${r.content}`
      )
      .join("\n\n")}`;

    const result = await callLLM(
      aiModel,
      RESEARCH_SYSTEM_PROMPT,
      `Based on the following research, extract financial benchmarks relevant to this business model:\n\nBusiness: ${financialModel.title} - ${financialModel.description}\n\nCurrent model assumptions:\n${financialModel.assumptions.join("\n")}\n\nCurrent financials summary:\n${JSON.stringify(
        financialModel.rows.filter((r) => r.category === "Summary"),
        null,
        2
      )}\n\n${researchContext}`
    );

    const durationMs = Date.now() - startTime;
    const estimatedCost = calculateCost(
      aiModel,
      result.inputTokens,
      result.outputTokens
    );

    let research;
    try {
      research = JSON.parse(result.content);
    } catch {
      return Response.json(
        { error: "Failed to parse research output. Please try again." },
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
