"use client";

import { AIMetrics } from "@/lib/types";

export function MetricsBar({ metrics }: { metrics: AIMetrics }) {
  return (
    <div className="flex items-center gap-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-400">Model</span>
        <span className="font-semibold text-slate-700">{metrics.model}</span>
      </div>
      <div className="h-4 w-px bg-slate-200" />
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-400">Tokens</span>
        <span className="font-semibold text-slate-700">
          {metrics.totalTokens.toLocaleString()}
        </span>
        <span className="text-xs text-slate-400">
          ({metrics.inputTokens.toLocaleString()} in /{" "}
          {metrics.outputTokens.toLocaleString()} out)
        </span>
      </div>
      <div className="h-4 w-px bg-slate-200" />
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-400">Cost</span>
        <span className="font-semibold text-emerald-600">
          ${metrics.estimatedCost.toFixed(4)}
        </span>
      </div>
      <div className="h-4 w-px bg-slate-200" />
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-400">Time</span>
        <span className="font-semibold text-slate-700">
          {(metrics.durationMs / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
