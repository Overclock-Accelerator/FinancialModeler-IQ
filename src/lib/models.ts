import { AIModel } from "./types";

export const AI_MODELS: AIModel[] = [
  {
    id: "claude-opus-4-7",
    name: "Claude Opus 4.7 (Thinking)",
    provider: "anthropic",
    modelId: "claude-opus-4-7",
    inputPricePer1M: 5.0,
    outputPricePer1M: 25.0,
    thinking: true,
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    modelId: "claude-haiku-4-5",
    inputPricePer1M: 1.0,
    outputPricePer1M: 5.0,
  },
  {
    id: "gpt-5-4",
    name: "GPT-5.4",
    provider: "openai",
    modelId: "gpt-5.4",
    inputPricePer1M: 2.5,
    outputPricePer1M: 15.0,
  },
  {
    id: "gpt-5-4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
    modelId: "gpt-5.4-mini",
    inputPricePer1M: 0.75,
    outputPricePer1M: 4.5,
  },
  {
    id: "gpt-5-4-nano",
    name: "GPT-5.4 Nano",
    provider: "openai",
    modelId: "gpt-5.4-nano",
    inputPricePer1M: 0.2,
    outputPricePer1M: 1.25,
  },
  {
    id: "gpt-4-1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    modelId: "gpt-4.1-nano",
    inputPricePer1M: 0.1,
    outputPricePer1M: 0.4,
  },
  {
    id: "deepseek-v3-2",
    name: "DeepSeek V3.2",
    provider: "openrouter",
    modelId: "deepseek/deepseek-v3.2",
    inputPricePer1M: 0.252,
    outputPricePer1M: 0.378,
  },
  {
    id: "kimi-k2-6",
    name: "Kimi K2.6",
    provider: "openrouter",
    modelId: "moonshotai/kimi-k2.6",
    inputPricePer1M: 0.56,
    outputPricePer1M: 3.5,
  },
  {
    id: "minimax-m2-5",
    name: "MiniMax M2.5",
    provider: "openrouter",
    modelId: "minimax/minimax-m2.5",
    inputPricePer1M: 0.15,
    outputPricePer1M: 1.2,
  },
  {
    id: "ling-2-6-flash",
    name: "Ling 2.6 Flash (Free)",
    provider: "openrouter",
    modelId: "inclusionai/ling-2.6-flash:free",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
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
