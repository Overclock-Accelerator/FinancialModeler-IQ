"use client";

import { AI_MODELS } from "@/lib/models";

interface ModelSelectorProps {
  selectedModelId: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModelId, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="model-select"
        className="text-sm font-medium text-slate-500"
      >
        AI Model
      </label>
      <select
        id="model-select"
        value={selectedModelId}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {AI_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} ({model.provider}) — ${model.inputPricePer1M}/M in, $
            {model.outputPricePer1M}/M out
          </option>
        ))}
      </select>
    </div>
  );
}
