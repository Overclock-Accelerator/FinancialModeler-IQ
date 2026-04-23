"use client";

import { AI_MODELS } from "@/lib/models";

interface ModelSelectorProps {
  selectedModelId: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModelId, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor="model-select"
        className="text-xs font-medium tracking-widest text-[#666] uppercase"
      >
        AI Model
      </label>
      <select
        id="model-select"
        value={selectedModelId}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[#333] bg-[#0d0d0d] px-3 py-2 text-xs text-[#ccc] tracking-wide transition-colors hover:border-[#555] focus:border-[#666] focus:outline-none"
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
