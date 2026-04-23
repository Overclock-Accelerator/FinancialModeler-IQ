export interface ModelRow {
  category: string;
  item: string;
  year1: number;
  year2: number;
  year3: number;
  notes: string;
}

export interface FinancialModel {
  id: string;
  title: string;
  description: string;
  rows: ModelRow[];
  assumptions: string[];
  createdAt: string;
}

export interface AIMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  durationMs: number;
  model: string;
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  risks: string[];
  suggestions: string[];
  metrics: AIMetrics;
}

export interface ResearchResult {
  benchmarks: {
    metric: string;
    value: string;
    source: string;
    url: string;
  }[];
  summary: string;
  adjustments: string[];
  metrics: AIMetrics;
}

export type ModelProvider = "anthropic" | "openai" | "openrouter";

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  modelId: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}
