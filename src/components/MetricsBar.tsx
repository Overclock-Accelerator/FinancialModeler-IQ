"use client";

import { AIMetrics } from "@/lib/types";

export function MetricsBar({ metrics }: { metrics: AIMetrics }) {
  return (
    <div className="flex flex-wrap items-center gap-5 border border-[#222] bg-[#0d0d0d] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-widest text-[#555] uppercase">Model</span>
        <span className="text-sm text-[#ccc]">{metrics.model}</span>
      </div>
      <div className="h-3 w-px bg-[#2a2a2a]" />
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-widest text-[#555] uppercase">Tokens</span>
        <span className="text-sm text-[#ccc]">
          {metrics.totalTokens.toLocaleString()}
        </span>
        <span className="text-xs text-[#444]">
          ({metrics.inputTokens.toLocaleString()} in /{" "}
          {metrics.outputTokens.toLocaleString()} out)
        </span>
      </div>
      <div className="h-3 w-px bg-[#2a2a2a]" />
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-widest text-[#555] uppercase">Cost</span>
        <span className="text-sm font-medium text-white">${metrics.estimatedCost.toFixed(4)}</span>
      </div>
      <div className="h-3 w-px bg-[#2a2a2a]" />
      <div className="flex items-center gap-2">
        <span className="text-xs tracking-widest text-[#555] uppercase">Time</span>
        <span className="text-sm text-[#ccc]">
          {(metrics.durationMs / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
