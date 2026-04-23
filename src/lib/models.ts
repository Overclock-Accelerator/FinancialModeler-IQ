import { AIModel } from "./types";

export const AI_MODELS: AIModel[] = [
  {
    id: "claude-sonnet",
    name: "Claude 4 Sonnet",
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  {
    id: "claude-haiku",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    modelId: "claude-3-5-haiku-20241022",
    inputPricePer1M: 0.8,
    outputPricePer1M: 4.0,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    modelId: "gpt-4o",
    inputPricePer1M: 2.5,
    outputPricePer1M: 10.0,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    modelId: "gpt-4o-mini",
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
  },
  {
    id: "gemini-2-flash",
    name: "Gemini 2.0 Flash",
    provider: "openrouter",
    modelId: "google/gemini-2.0-flash-001",
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.4,
  },
];

export function getModel(id: string): AIModel {
  const model = AI_MODELS.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown model: ${id}`);
  return model;
}

export function calculateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens / 1_000_000) * model.inputPricePer1M +
    (outputTokens / 1_000_000) * model.outputPricePer1M
  );
}
