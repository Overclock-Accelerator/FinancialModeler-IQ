export type DriverUnit = "currency" | "percent" | "count" | "multiplier";

export type DriverCategory =
  | "Volume"
  | "Pricing"
  | "Unit Costs"
  | "Fixed Costs"
  | "Growth"
  | "Other";

export type LineItemCategory =
  | "Revenue"
  | "COGS"
  | "OpEx"
  | "Other"
  | "Summary"
  | "UnitEconomics";

export interface Driver {
  id: string;
  label: string;
  category: DriverCategory;
  unit: DriverUnit;
  values: number[];
  min?: number;
  max?: number;
  step?: number;
  notes?: string;
}

export interface LineItem {
  id: string;
  label: string;
  category: LineItemCategory;
  formula: string;
  unit?: DriverUnit;
  isUnitEconomic?: boolean;
  notes?: string;
}

export interface FinancialModel {
  id: string;
  title: string;
  description: string;
  periods: string[];
  drivers: Driver[];
  lineItems: LineItem[];
  assumptions: string[];
  createdAt: string;
}

export interface ComputedLineItem extends LineItem {
  values: number[];
}

export interface ComputedModel {
  model: FinancialModel;
  driverValues: Record<string, number[]>;
  lineItems: ComputedLineItem[];
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ModelProvider = "anthropic" | "openai" | "openrouter";

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
  modelId: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  thinking?: boolean;
}
